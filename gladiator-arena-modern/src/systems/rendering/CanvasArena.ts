/**
 * CanvasArena - Multi-layer canvas renderer for the gladiator arena.
 * Layers: background, floor, fighters, effects, UI overlay.
 */

import { SpriteBatch } from './SpriteBatch';
import { ParticleSystem, type ParticleKind } from './ParticleSystem';

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

export class CanvasArena {
  private container: HTMLElement;
  private wrapper: HTMLElement;
  private layers: Record<LayerName, Layer>;
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
    const rect = this.container.getBoundingClientRect();
    this.viewport = { width: rect.width, height: rect.height };
    this.dpr = window.devicePixelRatio || 1;

    (Object.values(this.layers) as Layer[]).forEach(layer => {
      const { canvas, ctx } = layer;
      canvas.width = Math.max(1, Math.floor(rect.width * this.dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * this.dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
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

  private render(timestamp: number): void {
    if (!this.running) return;

    const dt = Math.min(48, timestamp - this.lastTimestamp || 16);
    this.lastTimestamp = timestamp;

    this.renderStaticLayers();
    this.clearDynamicLayers();
    this.drawFighters();
    this.particles.update(dt);
    this.particles.render(this.layers.effects.batch!);

    // Flush in order
    this.layers.fighters.batch?.flush();
    this.layers.effects.batch?.flush();
    this.layers.ui.batch?.flush();

    this.rafId = requestAnimationFrame(ts => this.render(ts));
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
        y: fighter.y + fighter.height * 0.45,
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

    this.fillLayer(this.layers.background.ctx, [
      { stop: 0, color: '#1f0f0f' },
      { stop: 0.6, color: '#2f1c14' },
      { stop: 1, color: '#130b0b' },
    ]);

    const floorCtx = this.layers.floor.ctx;
    this.clearCtx(floorCtx, this.layers.floor.canvas);
    const { width, height } = this.viewport;
    const sandHeight = Math.max(45, height * 0.28);
    const gradient = floorCtx.createLinearGradient(0, height - sandHeight, 0, height);
    gradient.addColorStop(0, '#c9a227');
    gradient.addColorStop(1, '#8b6914');
    floorCtx.fillStyle = gradient;
    floorCtx.fillRect(0, height - sandHeight, width, sandHeight);

    floorCtx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 6; i++) {
      const stripeY = height - sandHeight + i * (sandHeight / 6);
      floorCtx.fillRect(0, stripeY, width, 2);
    }
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
