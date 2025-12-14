/**
 * CanvasArena - Multi-layer canvas renderer for the gladiator arena.
 * Layers: background, floor, fighters, effects, UI overlay.
 * Supports grid-based movement zone visualization and debug overlays.
 */

import { SpriteBatch } from './SpriteBatch';
import { ParticleSystem, type ParticleKind } from './ParticleSystem';
import {
  computeGridGeometry,
  getMovementZoneBoundary,
  gridToPixel,
} from '../../utils/arenaGeometry';
import {
  getArenaImageFile,
  getMovementZoneSet,
  getStartingPositions,
  isValidCell,
} from '../../data/arenaConfig';
import type { GridGeometry, BattleMode } from '../../types/arena.types';

type LayerName = 'background' | 'floor' | 'fighters' | 'effects' | 'ui';

interface Layer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  batch?: SpriteBatch;
}

export type FighterVisualState = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  facing: 'left' | 'right';
  pose: 'idle' | 'attack' | 'block' | 'hit' | 'dash' | 'stagger' | 'victory' | 'death';
  tint: string;
  accent: string;
  shadowScale?: number;
  opacity?: number;
};

interface Viewport {
  width: number;
  height: number;
}

interface DebugOptions {
  showGrid: boolean;
  showMovementZone: boolean;
  showStartingPositions: boolean;
  showFighterCells: boolean;
}

export class CanvasArena {
  private container: HTMLElement;
  private wrapper: HTMLElement;
  private layers: Record<LayerName, Layer>;
  private backgroundImage: HTMLImageElement | null = null;
  private backgroundLoaded = false;
  private running = false;
  private rafId: number | null = null;
  private lastTimestamp = 0;
  private dpr = window.devicePixelRatio || 1;
  private viewport: Viewport = { width: 0, height: 0 };
  private fighters: Map<string, FighterVisualState> = new Map();
  private particles: ParticleSystem;
  private staticDirty = true;
  private readonly viewPadding = 80;
  private resizeObserver: ResizeObserver | null = null;
  private renderBodies = false;
  private gridGeometry: GridGeometry | null = null;
  private debugOptions: DebugOptions = {
    showGrid: false,
    showMovementZone: false,
    showStartingPositions: false,
    showFighterCells: false,
  };
  private currentBattleMode: BattleMode = '1v1';

  constructor(container: HTMLElement) {
    this.container = container;
    this.wrapper = document.createElement('div');
    this.wrapper.style.position = 'absolute';
    this.wrapper.style.inset = '0';
    this.wrapper.style.pointerEvents = 'none';
    this.wrapper.style.zIndex = '3';

    this.layers = {
      background: this.createLayer(0),
      floor: this.createLayer(1),
      fighters: this.createLayer(2, true),
      effects: this.createLayer(3, true),
      ui: this.createLayer(4, true),
    };

    this.particles = new ParticleSystem(() => this.viewport, this.viewPadding);

    this.container.appendChild(this.wrapper);
    this.resize();
    this.attachResizeObserver();
    this.loadBackgroundImage();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTimestamp = performance.now();
    this.rafId = requestAnimationFrame(ts => this.render(ts));
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  destroy(): void {
    this.stop();
    this.resizeObserver?.disconnect();
    this.fighters.clear();
    this.particles.clear();
    this.wrapper.remove();
  }

  resize(): void {
    // Use layout size (not transformed size) so geometry stays anchored
    // to the arena background rather than the camera zoom.
    const width = this.container.clientWidth || this.container.getBoundingClientRect().width;
    const height = this.container.clientHeight || this.container.getBoundingClientRect().height;
    this.viewport = { width, height };
    this.dpr = window.devicePixelRatio || 1;

    // Update grid geometry for the new viewport
    this.gridGeometry = computeGridGeometry(this.viewport);

    (Object.values(this.layers) as Layer[]).forEach(layer => {
      const { canvas, ctx } = layer;
      canvas.width = Math.max(1, Math.floor(width * this.dpr));
      canvas.height = Math.max(1, Math.floor(height * this.dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
    });

    this.staticDirty = true;
  }

  registerFighter(id: string, state: Omit<FighterVisualState, 'id'>): void {
    this.fighters.set(id, { id, ...state });
  }

  updateFighter(id: string, partial: Partial<FighterVisualState>): void {
    const existing = this.fighters.get(id);
    if (!existing) return;
    this.fighters.set(id, { ...existing, ...partial, id });
  }

  removeFighter(id: string): void {
    this.fighters.delete(id);
  }

  emitParticles(kind: ParticleKind, x: number, y: number, count = 8): void {
    this.particles.spawn(kind, x, y, count);
  }

  emitDustBurst(x: number, y: number, magnitude = 1): void {
    this.particles.spawn('dust', x, y, Math.max(4, Math.round(6 * magnitude)));
  }

  clearParticles(): void {
    this.particles.clear();
  }

  setRenderBodies(enabled: boolean): void {
    this.renderBodies = enabled;
  }

  setDebugOptions(options: Partial<DebugOptions>): void {
    this.debugOptions = { ...this.debugOptions, ...options };
    this.staticDirty = true;
  }

  setBattleMode(mode: BattleMode): void {
    this.currentBattleMode = mode;
    this.staticDirty = true;
  }

  getGridGeometry(): GridGeometry | null {
    return this.gridGeometry;
  }

  private render(timestamp: number): void {
    if (!this.running) return;

    const dt = Math.min(48, timestamp - this.lastTimestamp || 16);
    this.lastTimestamp = timestamp;

    this.renderStaticLayers();
    this.clearDynamicLayers();
    this.drawFighters();
    this.particles.update(dt);
    this.particles.render(this.layers.effects.batch!);

    // Draw fighter grid cells in debug mode (dynamic layer)
    if (this.debugOptions.showFighterCells) {
      this.renderFighterCells();
    }

    // Flush in order
    this.layers.fighters.batch?.flush();
    this.layers.effects.batch?.flush();
    this.layers.ui.batch?.flush();

    this.rafId = requestAnimationFrame(ts => this.render(ts));
  }

  private renderFighterCells(): void {
    if (!this.gridGeometry) return;

    const ctx = this.layers.ui.ctx;
    const { cellWidth, cellHeight } = this.gridGeometry;

    ctx.save();

    for (const fighter of this.fighters.values()) {
      // Get the fighter's current grid cell
      const col = Math.floor(fighter.x / cellWidth);
      const row = Math.floor(fighter.y / cellHeight);

      // Check if in valid movement zone
      const inZone = isValidCell(row, col);

      // Draw cell highlight
      const x = col * cellWidth;
      const y = row * cellHeight;

      ctx.fillStyle = inZone
        ? 'rgba(50, 205, 50, 0.25)'
        : 'rgba(255, 50, 50, 0.35)';
      ctx.fillRect(x, y, cellWidth, cellHeight);

      // Draw cell border
      ctx.strokeStyle = inZone
        ? 'rgba(50, 205, 50, 0.8)'
        : 'rgba(255, 50, 50, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cellWidth, cellHeight);

      // Draw cell coordinates
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${row},${col}`, x + cellWidth / 2, y + cellHeight - 2);
    }

    ctx.restore();
  }

  private drawFighters(): void {
    const batch = this.layers.fighters.batch;
    if (!batch) return;

    const view = this.viewport;
    for (const fighter of this.fighters.values()) {
      if (!this.isInView(fighter, view)) continue;

      const shadowScale = fighter.shadowScale ?? 1;
      const shadowWidth = fighter.width * 0.75 * shadowScale;
      const shadowHeight = Math.max(10, fighter.height * 0.16 * shadowScale);
      batch.add({
        type: 'ellipse',
        x: fighter.x,
        y: fighter.y + fighter.height * 0.06,
        rx: shadowWidth / 2,
        ry: shadowHeight / 2,
        fill: 'rgba(0,0,0,0.35)',
        opacity: 0.8,
        blur: 3,
      });

      if (!this.renderBodies) continue;

      const poseIntensity = this.poseIntensity(fighter.pose);
      const bodyHeight = fighter.height * 0.82;
      const bodyWidth = fighter.width * 0.82;
      const originX = fighter.x - bodyWidth / 2;
      const originY = fighter.y - bodyHeight;
      const accent = fighter.accent;
      const tint = fighter.tint;
      const stroke = fighter.facing === 'left' ? `${accent}cc` : `${accent}88`;

      batch.add({
        type: 'rounded-rect',
        x: originX,
        y: originY,
        width: bodyWidth,
        height: bodyHeight,
        radius: 16,
        fill: this.mixColor(tint, '#2c1810', 0.18 * poseIntensity),
        stroke,
        opacity: fighter.opacity ?? 1,
        shadowBlur: 10 * poseIntensity,
        shadowColor: `${accent}55`,
      });

      batch.add({
        type: 'rounded-rect',
        x: originX + 8,
        y: originY + 10,
        width: bodyWidth - 16,
        height: bodyHeight * 0.3,
        radius: 12,
        fill: accent,
        opacity: 0.15 + 0.15 * poseIntensity,
      });
    }
  }

  private isInView(fighter: FighterVisualState, view: Viewport): boolean {
    const pad = this.viewPadding;
    const left = fighter.x - fighter.width / 2;
    const right = fighter.x + fighter.width / 2;
    const top = fighter.y - fighter.height;
    const bottom = fighter.y + fighter.height * 0.25;
    return right >= -pad && left <= view.width + pad && bottom >= -pad && top <= view.height + pad;
  }

  private renderStaticLayers(): void {
    if (!this.staticDirty) return;
    this.staticDirty = false;

    this.renderBackground();

    const floorCtx = this.layers.floor.ctx;
    this.clearCtx(floorCtx, this.layers.floor.canvas);
    const { width, height } = this.viewport;
    const overlayHeight = Math.max(80, height * 0.22);
    const overlay = floorCtx.createLinearGradient(0, height - overlayHeight, 0, height);
    overlay.addColorStop(0, 'rgba(0,0,0,0)');
    overlay.addColorStop(1, 'rgba(0,0,0,0.35)');
    floorCtx.fillStyle = overlay;
    floorCtx.fillRect(0, height - overlayHeight, width, overlayHeight);

    this.renderArenaBoundary(floorCtx);

    // Debug overlays
    if (this.hasDebugEnabled()) {
      this.renderDebugOverlay(floorCtx);
    }
  }

  private hasDebugEnabled(): boolean {
    return (
      this.debugOptions.showGrid ||
      this.debugOptions.showMovementZone ||
      this.debugOptions.showStartingPositions
    );
  }

  private renderDebugOverlay(ctx: CanvasRenderingContext2D): void {
    if (!this.gridGeometry) return;

    const { cellWidth, cellHeight, grid } = this.gridGeometry;
    const { width, height } = this.viewport;

    ctx.save();

    // Draw grid lines
    if (this.debugOptions.showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 0.5;

      // Vertical lines
      for (let col = 0; col <= grid.columns; col++) {
        const x = col * cellWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let row = 0; row <= grid.rows; row++) {
        const y = row * cellHeight;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // Highlight valid movement zone cells
    if (this.debugOptions.showMovementZone) {
      const zoneSet = getMovementZoneSet();
      ctx.fillStyle = 'rgba(50, 205, 50, 0.12)';

      for (const cellKey of zoneSet) {
        const [rowStr, colStr] = cellKey.split(',');
        const row = parseInt(rowStr, 10);
        const col = parseInt(colStr, 10);

        const x = col * cellWidth;
        const y = row * cellHeight;
        ctx.fillRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);
      }

      // Draw cell coordinates for some cells (every 5th cell)
      if (this.debugOptions.showGrid) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = `${Math.min(10, cellWidth / 4)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (const cellKey of zoneSet) {
          const [rowStr, colStr] = cellKey.split(',');
          const row = parseInt(rowStr, 10);
          const col = parseInt(colStr, 10);

          if (row % 5 === 0 && col % 5 === 0) {
            const pixel = gridToPixel(row, col, this.gridGeometry);
            ctx.fillText(`${row},${col}`, pixel.x, pixel.y);
          }
        }
      }
    }

    // Draw starting position markers
    if (this.debugOptions.showStartingPositions) {
      const positions = getStartingPositions(this.currentBattleMode);

      // Team A positions (blue)
      ctx.fillStyle = 'rgba(59, 130, 246, 0.7)';
      ctx.strokeStyle = 'rgba(59, 130, 246, 1)';
      ctx.lineWidth = 2;
      for (const cell of positions.teamA) {
        const pixel = gridToPixel(cell.row, cell.col, this.gridGeometry);
        ctx.beginPath();
        ctx.arc(pixel.x, pixel.y, Math.min(cellWidth, cellHeight) / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Team B positions (red)
      ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.strokeStyle = 'rgba(239, 68, 68, 1)';
      for (const cell of positions.teamB) {
        const pixel = gridToPixel(cell.row, cell.col, this.gridGeometry);
        ctx.beginPath();
        ctx.arc(pixel.x, pixel.y, Math.min(cellWidth, cellHeight) / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Draw battle mode label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`Mode: ${this.currentBattleMode}`, 10, 10);
    }

    ctx.restore();
  }

  private renderArenaBoundary(ctx: CanvasRenderingContext2D): void {
    if (!this.gridGeometry) return;

    // Get the movement zone boundary polygon
    const boundary = getMovementZoneBoundary(this.gridGeometry);
    if (boundary.length < 3) return;

    ctx.save();

    // Draw filled movement zone with subtle highlight
    ctx.fillStyle = 'rgba(220, 180, 120, 0.03)';
    ctx.beginPath();
    ctx.moveTo(boundary[0].x, boundary[0].y);
    for (let i = 1; i < boundary.length; i++) {
      ctx.lineTo(boundary[i].x, boundary[i].y);
    }
    ctx.closePath();
    ctx.fill();

    // Draw boundary stroke
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.7)';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(boundary[0].x, boundary[0].y);
    for (let i = 1; i < boundary.length; i++) {
      ctx.lineTo(boundary[i].x, boundary[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }

  private clearDynamicLayers(): void {
    this.clearCtx(this.layers.fighters.ctx, this.layers.fighters.canvas);
    this.clearCtx(this.layers.effects.ctx, this.layers.effects.canvas);
    this.clearCtx(this.layers.ui.ctx, this.layers.ui.canvas);
    this.layers.fighters.batch?.clear();
    this.layers.effects.batch?.clear();
    this.layers.ui.batch?.clear();
  }

  private fillLayer(
    ctx: CanvasRenderingContext2D,
    stops: Array<{ stop: number; color: string }>
  ): void {
    const canvas = (ctx.canvas as HTMLCanvasElement) || ctx.canvas;
    const { width, height } = this.viewport;
    this.clearCtx(ctx, canvas);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    stops.forEach(stop => gradient.addColorStop(stop.stop, stop.color));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  private renderBackground(): void {
    const ctx = this.layers.background.ctx;
    const canvas = this.layers.background.canvas;
    this.clearCtx(ctx, canvas);

    if (this.backgroundImage && this.backgroundLoaded) {
      const { width, height } = this.viewport;
      const img = this.backgroundImage;

      // Grid-aligned scaling: image maps 1:1 to the grid coordinate system
      // The image covers the entire viewport, with grid cells calculated from viewport dimensions
      // Use "cover" mode to ensure the entire viewport is filled while maintaining aspect ratio
      const imgAspect = img.width / img.height;
      const viewAspect = width / height;

      let drawWidth: number;
      let drawHeight: number;
      let offsetX: number;
      let offsetY: number;

      if (viewAspect > imgAspect) {
        // Viewport is wider than image - scale by width
        drawWidth = width;
        drawHeight = width / imgAspect;
        offsetX = 0;
        offsetY = (height - drawHeight) / 2;
      } else {
        // Viewport is taller than image - scale by height
        drawHeight = height;
        drawWidth = height * imgAspect;
        offsetX = (width - drawWidth) / 2;
        offsetY = 0;
      }

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      // Subtle vignette overlay
      const vignette = ctx.createLinearGradient(0, 0, 0, height);
      vignette.addColorStop(0, 'rgba(0,0,0,0.15)');
      vignette.addColorStop(0.5, 'rgba(0,0,0,0.05)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.25)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
      return;
    }

    this.fillLayer(ctx, [
      { stop: 0, color: '#1f0f0f' },
      { stop: 0.6, color: '#2f1c14' },
      { stop: 1, color: '#130b0b' },
    ]);
  }

  private createLayer(zIndex: number, batched: boolean = false): Layer {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.zIndex = `${zIndex}`;
    canvas.style.pointerEvents = 'none';
    this.wrapper.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create canvas context');

    return {
      canvas,
      ctx,
      batch: batched ? new SpriteBatch(ctx) : undefined,
    };
  }

  private clearCtx(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private loadBackgroundImage(): void {
    const img = new window.Image();
    // Load from arena config - image path from config file
    const imageFile = getArenaImageFile();
    img.src = `/images/arena/${imageFile}`;
    img.onload = () => {
      this.backgroundImage = img;
      this.backgroundLoaded = true;
      this.staticDirty = true;
    };
    img.onerror = () => {
      console.warn(`Failed to load arena background image: ${imageFile}`);
    };
  }

  private poseIntensity(pose: FighterVisualState['pose']): number {
    switch (pose) {
      case 'attack':
      case 'dash':
        return 1.2;
      case 'block':
      case 'stagger':
        return 0.9;
      case 'victory':
        return 1.35;
      case 'death':
        return 0.6;
      default:
        return 0.75;
    }
  }

  private mixColor(base: string, overlay: string, amount: number): string {
    const clamp = (value: number) => Math.max(0, Math.min(255, value));
    const parse = (hex: string) => {
      const normalized = hex.replace('#', '');
      const r = parseInt(normalized.substring(0, 2), 16);
      const g = parseInt(normalized.substring(2, 4), 16);
      const b = parseInt(normalized.substring(4, 6), 16);
      return { r, g, b };
    };
    const a = parse(base);
    const b = parse(overlay);
    const r = clamp(Math.round(a.r * (1 - amount) + b.r * amount));
    const g = clamp(Math.round(a.g * (1 - amount) + b.g * amount));
    const bl = clamp(Math.round(a.b * (1 - amount) + b.b * amount));
    return `rgb(${r}, ${g}, ${bl})`;
  }

  private attachResizeObserver(): void {
    if (this.resizeObserver) return;
    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    this.resizeObserver.observe(this.container);
  }
}
