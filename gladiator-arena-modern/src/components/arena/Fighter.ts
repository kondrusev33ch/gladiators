/**
 * Fighter - Manages a fighter in the arena
 */

import type { Fighter as FighterData } from '../../types/gladiator.types';
import type { AnimationDirection, AnimationOptions, SpriteAnimation } from './Sprite';
import { Sprite } from './Sprite';
import { createElement } from '../../utils/dom';
import { MOVEMENT, TIMING } from '../../data/config';
import { eventBus, EVENTS } from '../../core/EventBus';
import { clamp } from '../../utils/math';
import type { CanvasArena, FighterVisualState } from '../../systems/rendering/CanvasArena';
import type { CameraTarget } from '../../types/camera.types';
import type { GridCell, GridGeometry, MovementZoneBounds, BattleMode } from '../../types/arena.types';
import {
  computeFloorGeometry,
  computeGridGeometry,
  gridToPixel,
  pixelToGrid,
  isValidCell,
  getValidRows,
  type FloorGeometry,
} from '../../utils/arenaGeometry';
import {
  getStartingPositions,
  calculateGladiatorSize,
  getRowSegments,
  findNearestValidColInRow,
} from '../../data/arenaConfig';

type Direction = 'left' | 'right';

export class Fighter {
  private container: HTMLElement;
  private sprite: Sprite;
  private data: FighterData;
  private isPlayer: boolean;
  private arenaWidth: number;
  private renderer?: CanvasArena;

  // Pixel-based position tracking
  private currentX: number;
  private entryX: number;
  private baseTransform = '';
  private impulseTransform = '';
  private footworkTimeout: number | null = null;
  private direction: AnimationDirection = 'side';
  private lastVisualX: number;
  private lastGridRow: number;
  private rootMotionTimeout: number | null = null;
  private readonly renderId: 'player' | 'enemy';
  private renderTint: string;
  private renderAccent: string;
  private facing: 'left' | 'right';
  private currentPose: FighterVisualState['pose'] = 'idle';

  // Grid-based position tracking
  private gridRow: number;
  private gridCol: number;
  private validRows: number[];
  private gridGeometry!: GridGeometry;

  private nameEl!: HTMLElement;
  private healthBarEl!: HTMLElement;
  private staminaBarEl!: HTMLElement;
  private damageEl!: HTMLElement;
  private spriteContainer!: HTMLElement;
  private hudEl!: HTMLElement;
  private fighterEl!: HTMLElement;
  private subscriptions: Array<{ unsubscribe: () => void }> = [];
  private readonly id: 'player' | 'enemy';

  private static readonly BASE_SPRITE_HEIGHT = 72;

  constructor(
    arena: HTMLElement,
    data: FighterData,
    isPlayer: boolean,
    renderer?: CanvasArena,
    teamIndex: number = 0,
    battleMode: BattleMode = '1v1'
  ) {
    this.container = arena;
    this.data = data;
    this.isPlayer = isPlayer;
    this.renderer = renderer;
    this.arenaWidth = Math.max(1, this.container.clientWidth || 0);
    this.id = this.isPlayer ? 'player' : 'enemy';
    this.renderId = this.id;
    this.renderTint = this.isPlayer ? '#2563eb' : '#c2410c';
    this.renderAccent = this.isPlayer ? '#7dd3fc' : '#f59e0b';
    this.facing = this.isPlayer ? 'right' : 'left';

    // Initialize grid geometry
    this.validRows = getValidRows();
    this.updateGridGeometry();

    // Get starting position from arena config based on battle mode
    const startingPositions = getStartingPositions(battleMode);
    const teamPositions = this.isPlayer ? startingPositions.teamA : startingPositions.teamB;
    const startCell = teamPositions[teamIndex] ?? teamPositions[0];

    // Initialize grid position
    this.gridRow = startCell.row;
    this.gridCol = startCell.col;

    // Convert grid position to pixel coordinates
    const entryPixel = gridToPixel(this.gridRow, this.gridCol, this.gridGeometry);
    this.entryX = entryPixel.x;

    // Start off-screen and walk toward the entry point
    const outside = Math.max(220, Math.round(this.arenaWidth * 0.18));
    this.currentX = this.isPlayer
      ? Math.min(this.entryX - outside, -outside)
      : Math.max(this.entryX + outside, this.arenaWidth + outside);
    this.lastVisualX = this.currentX;
    this.lastGridRow = this.gridRow;

    // Create sprite instance
    this.spriteContainer = createElement('div', { className: 'fighter__sprite-container' });
    this.sprite = new Sprite(this.spriteContainer, {
      onRootMotion: (distance: number, duration: number) => this.applyRootMotion(distance, duration),
    });

    this.createFighterElement();
    this.registerWithRenderer();
  }

  /**
   * Create fighter HTML structure
   */
  private createFighterElement(): void {
    this.fighterEl = createElement('div', {
      className: `fighter absolute bottom-[30px] text-center z-10 transition-all duration-1000 ease-out ${this.isPlayer ? 'fighter--player' : 'fighter--enemy'}`,
      attributes: {
        'data-fighter': this.isPlayer ? 'player' : 'enemy',
      },
    });
    this.fighterEl.style.minHeight = '96px';
    this.applyConfigDrivenSizing();

    // Set initial off-screen position using inline styles (center-based)
    const fighterWidth = this.fighterEl.offsetWidth || 100;
    this.fighterEl.style.left = `${this.currentX - fighterWidth / 2}px`;

    // Name
    this.nameEl = createElement('div', {
      className: 'font-cinzel text-[10px] font-semibold text-white bg-black/70 px-1.5 py-0.5 rounded inline-block mb-1',
      textContent: this.data.name,
    });

    const meterStack = createElement('div', {
      className: 'w-full flex flex-col items-center gap-[2px] mb-1',
    });

    // Health bar container
    const healthContainer = createElement('div', {
      className: 'w-full h-[7px] bg-[#222] border-[1.25px] border-[#111] rounded overflow-hidden',
      innerHTML: '<div class="fighter__health-bar w-full h-full bg-[#2d5a27] transition-all duration-300"></div>',
    });
    this.healthBarEl = healthContainer.querySelector('.fighter__health-bar') as HTMLElement;

    // Stamina bar container (sits just below health)
    const staminaContainer = createElement('div', {
      className: 'w-full h-[5px] bg-[#0f172a] border-[1.25px] border-[#0b1220] rounded overflow-hidden shadow-inner',
      innerHTML: '<div class="fighter__stamina-bar w-full h-full bg-[#2563eb] transition-all duration-300"></div>',
    });
    this.staminaBarEl = staminaContainer.querySelector('.fighter__stamina-bar') as HTMLElement;

    // Damage display
    this.damageEl = createElement('div', {
      className:
        'fighter__damage absolute top-[-24px] left-1/2 -translate-x-1/2 font-cinzel font-bold text-lg pointer-events-none z-30 opacity-0',
      attributes: { 'data-damage': '' },
    });

    meterStack.appendChild(healthContainer);
    meterStack.appendChild(staminaContainer);

    this.hudEl = createElement('div', {
      className: 'fighter__hud w-full flex flex-col items-center pointer-events-none',
    });
    this.hudEl.appendChild(this.nameEl);
    this.hudEl.appendChild(meterStack);

    // Append elements
    this.fighterEl.appendChild(this.hudEl);
    this.fighterEl.appendChild(this.damageEl);
    this.fighterEl.appendChild(this.spriteContainer);

    this.container.appendChild(this.fighterEl);

    // Now that we can measure the fighter width, compute spawn/entry points
    // based on the actual elliptical movement zone at this fighter's lane.
    this.resetSpawnAndEntryPositions();

    this.applyTransform();

    // Create sprite - player faces right, enemy faces left during entrance
    this.sprite.create(this.data.weapon, !this.isPlayer);
    this.applyConfigDrivenSizing();
    this.updateHealth();
    this.updateStamina(this.data.stamina, this.data.maxStamina);
    this.registerEvents();
  }

  private registerWithRenderer(): void {
    if (!this.renderer) return;
    this.renderer.registerFighter(this.renderId, this.buildRenderState());
    this.syncRenderer();
  }

  private getViewport(): { width: number; height: number } {
    return {
      width: Math.max(1, this.container?.clientWidth || this.arenaWidth || 1),
      height: Math.max(1, this.container?.clientHeight || 420),
    };
  }

  private getFloorGeometry(): FloorGeometry {
    return computeFloorGeometry(this.getViewport(), this.getHalfWidth());
  }

  private updateGridGeometry(): void {
    this.gridGeometry = computeGridGeometry(this.getViewport());
    this.applyConfigDrivenSizing();
  }

  private syncGridPosition(): void {
    const cell = pixelToGrid(this.currentX, this.getPixelY(), this.gridGeometry);
    this.gridCol = cell.col;
    // Row is tracked separately via strafing
  }

  private getPixelY(): number {
    return gridToPixel(this.gridRow, this.gridCol, this.gridGeometry).y;
  }

  private buildRenderState(): FighterVisualState {
    const { width, height } = this.getRenderDimensions();
    const pose = this.currentPose;
    return {
      id: this.renderId,
      x: this.currentX,
      y: this.getRenderY(),
      width,
      height,
      facing: this.facing,
      pose,
      tint: this.renderTint,
      accent: this.renderAccent,
      shadowScale: this.shadowScaleForPose(pose),
      opacity: pose === 'death' ? 0.7 : 1,
    };
  }

  private getRenderDimensions(): { width: number; height: number } {
    // Use config-driven sizing based on grid cell size and heightRatio
    return calculateGladiatorSize(this.gridGeometry);
  }

  private getRenderY(): number {
    return this.getPixelY();
  }

  private shadowScaleForPose(pose: FighterVisualState['pose']): number {
    switch (pose) {
      case 'attack':
        return 1.08;
      case 'dash':
        return 1.02;
      case 'stagger':
        return 0.9;
      case 'death':
        return 0.82;
      default:
        return 1;
    }
  }

  private syncRenderer(partial: Partial<FighterVisualState> = {}): void {
    if (!this.renderer) return;
    const base = this.buildRenderState();
    this.renderer.updateFighter(this.renderId, { ...base, ...partial });
  }

  /**
   * Enter the arena (walk in animation)
   */
  enter(): void {
    setTimeout(() => {
      this.play('walk', {
        direction: 'oblique',
        blend: true,
      });
      this.moveToX(this.entryX, 900);

      // After entrance, turn enemy to face player (flip from left to right)
      if (!this.isPlayer) {
        setTimeout(() => {
          this.setFacing(false);
        }, 1000);
      }
    }, 100);
  }

  /**
   * Stop walking and go idle
   */
  idle(): void {
    this.play('idle', {
      direction: this.direction,
      blend: true,
    });
  }

  /**
   * Perform attack animation
   */
  attack(): void {
    const lungeDistance = MOVEMENT.LUNGE_DISTANCE * (this.isPlayer ? 1 : -1);
    this.play('attack', {
      direction: this.direction,
      blend: true,
      rootMotion: {
        distance: lungeDistance * 0.9,
        duration: TIMING.LUNGE_DURATION,
      },
      layers: ['weapon-trail'],
    });
    setTimeout(() => {
      this.play('idle', { direction: this.direction, blend: true });
    }, TIMING.ATTACK_DURATION);
  }

  block(): void {
    this.play('block', {
      direction: this.direction,
      blend: true,
      layers: ['shield-brace'],
    });
  }

  parry(): void {
    this.play('parry', {
      direction: this.direction,
      blend: true,
      layers: ['weapon-trail'],
    });
  }

  stagger(direction: Direction, distance: number): void {
    const delta = direction === 'left' ? -distance : distance;
    this.moveBy(delta, 240, 'retreat');
    this.play('stagger', {
      direction: this.direction,
      blend: true,
      rootMotion: {
        distance: delta * 0.2,
        duration: 220,
      },
    });
  }

  /**
   * Play hit animation
   */
  hit(): void {
    this.play('hit', {
      direction: this.direction,
      blend: true,
    });
    setTimeout(() => {
      if (this.data.currentHp > 0) {
        this.play('idle', { direction: this.direction, blend: true });
      }
    }, 400);
  }

  /**
   * Play death animation
   */
  death(): void {
    this.play('death', {
      direction: this.direction,
      blend: true,
    });
  }

  /**
   * Play victory animation
   */
  victory(): void {
    this.play('victory', {
      direction: this.direction,
      blend: true,
    });
  }

  /**
   * Show damage number
   */
  showDamage(amount: number, isCrit: boolean): void {
    this.damageEl.textContent = amount.toString();
    this.damageEl.style.color = isCrit ? '#ff1744' : '#8b1a1a';
    this.damageEl.style.fontSize = isCrit ? '1.6rem' : '1.2rem';
    this.damageEl.classList.remove('fighter__damage--animate');
    void this.damageEl.offsetHeight; // Force reflow
    this.damageEl.classList.add('fighter__damage--animate');
  }

  /**
   * Show text (like "DODGE")
   */
  showText(text: string): void {
    this.damageEl.textContent = text;
    this.damageEl.style.color = '#1565c0';
    this.damageEl.style.fontSize = '1.4rem';
    this.damageEl.classList.remove('fighter__damage--animate');
    void this.damageEl.offsetHeight;
    this.damageEl.classList.add('fighter__damage--animate');
  }

  /**
   * Update health bar
   */
  updateHealth(): void {
    const percent = (this.data.currentHp / this.data.maxHp) * 100;
    this.healthBarEl.style.width = `${percent}%`;

    // Change color when low health
    if (percent < 30) {
      this.healthBarEl.style.background = '#8b1a1a';
    } else {
      this.healthBarEl.style.background = '#2d5a27';
    }
  }

  /**
   * Update stamina bar
   */
  updateStamina(value?: number, max?: number): void {
    if (typeof max === 'number') {
      this.data.maxStamina = Math.max(1, max);
    }
    if (typeof value === 'number') {
      this.data.stamina = clamp(value, 0, this.data.maxStamina);
    }

    const percent = (this.data.stamina / this.data.maxStamina) * 100;
    this.staminaBarEl.style.width = `${percent}%`;

    // Shift to warning color when low stamina
    if (percent < 25) {
      this.staminaBarEl.style.background = '#f59e0b';
    } else {
      this.staminaBarEl.style.background = '#2563eb';
    }
  }

  /**
   * Get fighter data
   */
  getData(): FighterData {
    return this.data;
  }

  /**
   * Get the center position of the fighter for effects
   */
  getPosition(): { x: number; y: number } {
    const rect = this.fighterEl.getBoundingClientRect();
    const arenaRect = this.container.getBoundingClientRect();

    // CameraDirector applies a CSS `scale()` transform to the arena viewport.
    // `getBoundingClientRect()` returns screen-space coordinates after transforms,
    // so convert back into the arena's local (pre-zoom) coordinate space.
    const zoomVar = window.getComputedStyle(this.container).getPropertyValue('--camera-zoom');
    const zoom = Number.parseFloat(zoomVar);
    const scale = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;

    return {
      x: (rect.left - arenaRect.left + rect.width / 2) / scale,
      y: (rect.top - arenaRect.top + rect.height / 2) / scale,
    };
  }

  /**
   * Expose a camera-friendly bounding box for framing.
   */
  getCameraTarget(): CameraTarget {
    const { width, height } = this.getRenderDimensions();
    return {
      x: this.currentX,
      y: this.getRenderY(),
      width,
      height,
    };
  }

  /**
   * Dodge or dash animation with directionality
   */
  dodge(direction: Direction, distance: number = MOVEMENT.DODGE.DISTANCE): number {
    const delta = direction === 'left' ? -distance : distance;
    const moved = this.moveBy(delta, 180, 'retreat', {
      direction: this.direction,
      rootMotion: { distance: delta * 0.55, duration: 200 },
      layers: ['head-track'],
      blend: true,
    });
    return moved;
  }

  dash(direction: Direction, distance: number = MOVEMENT.DASH.DISTANCE): number {
    const delta = direction === 'left' ? -distance : distance;
    const moved = this.moveBy(delta, 180, 'dash', {
      direction: this.direction,
      rootMotion: { distance: delta * 0.35, duration: 200 },
      layers: ['weapon-trail'],
      blend: true,
    });
    return moved;
  }

  advanceToward(targetX: number, maxStep: number): number {
    const direction = this.currentX < targetX ? 1 : -1;
    const animation: SpriteAnimation =
      (direction > 0 && this.isPlayer) || (direction < 0 && !this.isPlayer)
        ? 'advance'
        : 'retreat';
    return this.moveBy(direction * maxStep, 180, animation);
  }

  retreatFrom(targetX: number, maxStep: number): number {
    const direction = this.currentX < targetX ? -1 : 1;
    return this.moveBy(direction * maxStep, 180, 'retreat');
  }

  strafe(direction: -1 | 1): boolean {
    // Find next valid row in the direction
    const currentRowIndex = this.validRows.indexOf(this.gridRow);
    if (currentRowIndex === -1) return false;

    const nextRowIndex = clamp(currentRowIndex + direction, 0, this.validRows.length - 1);
    if (nextRowIndex === currentRowIndex) return false;

    const nextRow = this.validRows[nextRowIndex];
    if (nextRow === undefined) return false;

    if (!isValidCell(nextRow, this.gridCol)) {
      const nearestCol = findNearestValidColInRow(nextRow, this.gridCol);
      if (nearestCol === null) return false;
      this.gridCol = nearestCol;
      this.currentX = gridToPixel(nextRow, this.gridCol, this.gridGeometry).x;
    } else {
      this.currentX = this.clampXToRowSegments(this.currentX, nextRow);
    }

    this.gridRow = nextRow;
    this.applyPosition(200);
    this.setFootworkAnimation('strafe', 320, { direction: this.direction, blend: true });
    return true;
  }

  getCenterX(): number {
    return this.currentX;
  }

  getArenaBounds(): { left: number; right: number; width: number; grid: GridGeometry; bounds: MovementZoneBounds } {
    const floor = this.getFloorGeometry();
    return {
      left: floor.left,
      right: floor.right,
      width: floor.width,
      grid: floor.grid,
      bounds: floor.bounds,
    };
  }

  getGridPosition(): GridCell {
    return { row: this.gridRow, col: this.gridCol };
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
    this.renderer?.removeFighter(this.renderId);
    this.sprite.destroy();
    this.fighterEl.remove();
    if (this.footworkTimeout) {
      window.clearTimeout(this.footworkTimeout);
      this.footworkTimeout = null;
    }
    if (this.rootMotionTimeout) {
      window.clearTimeout(this.rootMotionTimeout);
      this.rootMotionTimeout = null;
    }
  }

  private play(animation: SpriteAnimation, options: AnimationOptions = {}): void {
    this.sprite.setAnimation(animation, options);
    this.currentPose = this.mapPose(animation);
    this.syncRenderer({ pose: this.currentPose });
  }

  private mapPose(animation: SpriteAnimation): FighterVisualState['pose'] {
    switch (animation) {
      case 'attack':
        return 'attack';
      case 'block':
      case 'parry':
        return 'block';
      case 'walk':
      case 'advance':
      case 'retreat':
      case 'strafe':
      case 'dash':
        return 'dash';
      case 'stagger':
      case 'hit':
        return 'stagger';
      case 'victory':
        return 'victory';
      case 'death':
        return 'death';
      default:
        return 'idle';
    }
  }

  private setFacing(flipped: boolean): void {
    this.sprite.setFlipped(flipped);
    this.facing = flipped ? 'left' : 'right';
    this.syncRenderer();
  }

  private moveToX(x: number, durationMs: number): void {
    this.currentX = x;
    this.applyPosition(durationMs);
  }

  private moveBy(
    deltaX: number,
    durationMs: number,
    animation?: SpriteAnimation,
    animationOptions: AnimationOptions = {}
  ): number {
    const desiredX = this.currentX + deltaX;
    const nextX = this.clampXToRowSegments(desiredX, this.gridRow);
    const applied = nextX - this.currentX;

    if (applied === 0) return 0;

    this.currentX = nextX;
    this.syncGridPosition();
    this.applyPosition(durationMs);
    this.emitFootworkDust(applied, animation);

    if (animation) {
      const optionsWithDirection: AnimationOptions = {
        direction: this.direction,
        blend: true,
        ...animationOptions,
      };
      this.setFootworkAnimation(animation, durationMs + 120, optionsWithDirection);
    }

    return applied;
  }

  private getHalfWidth(): number {
    // Use config-driven sizing
    const { width } = calculateGladiatorSize(this.gridGeometry);
    return width / 2;
  }

  private applyConfigDrivenSizing(): void {
    if (!this.fighterEl || !this.gridGeometry) return;

    const { width, height } = calculateGladiatorSize(this.gridGeometry);
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);

    const spriteScale = safeHeight / Fighter.BASE_SPRITE_HEIGHT;
    this.fighterEl.style.setProperty('--sprite-scale', `${spriteScale}`);
    const uiScale = clamp(spriteScale, 0.55, 1.15);
    this.fighterEl.style.setProperty('--ui-scale', `${uiScale}`);
    this.fighterEl.style.setProperty('--combat-text-scale', `${uiScale}`);
    if (this.hudEl) {
      this.hudEl.style.transform = `scale(${uiScale})`;
      this.hudEl.style.transformOrigin = 'top center';
    }

    // Keep UI readable, but size the sprite area to match config-driven dimensions.
    this.fighterEl.style.width = `${Math.ceil(Math.max(56, safeWidth))}px`;
    this.spriteContainer.style.width = `${Math.ceil(safeWidth)}px`;
    this.spriteContainer.style.height = `${Math.ceil(safeHeight)}px`;
  }

  private getRowXIntervals(row: number): Array<{ minX: number; maxX: number }> {
    const halfWidth = this.getHalfWidth();
    const { cellWidth } = this.gridGeometry;

    return getRowSegments(row)
      .map((segment) => {
        const minX = segment.minCol * cellWidth + halfWidth;
        const maxX = (segment.maxCol + 1) * cellWidth - halfWidth;
        if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return null;
        if (minX > maxX) {
          const center = (minX + maxX) / 2;
          return { minX: center, maxX: center };
        }
        return { minX, maxX };
      })
      .filter((value): value is { minX: number; maxX: number } => value !== null);
  }

  private findIntervalForX(
    x: number,
    intervals: Array<{ minX: number; maxX: number }>
  ): { minX: number; maxX: number } | null {
    if (!intervals.length) return null;
    for (const interval of intervals) {
      if (x >= interval.minX && x <= interval.maxX) return interval;
    }

    let best: { minX: number; maxX: number } | null = null;
    let bestDist = Infinity;
    for (const interval of intervals) {
      const clamped = clamp(x, interval.minX, interval.maxX);
      const dist = Math.abs(x - clamped);
      if (dist < bestDist) {
        bestDist = dist;
        best = interval;
      }
    }
    return best;
  }

  private clampXToRowSegments(x: number, row: number): number {
    const intervals = this.getRowXIntervals(row);
    const currentInterval = this.findIntervalForX(this.currentX, intervals);
    const interval = currentInterval ?? this.findIntervalForX(x, intervals);
    if (!interval) return x;
    return clamp(x, interval.minX, interval.maxX);
  }

  private clampRootMotion(distance: number): number {
    const desired = this.currentX + distance;
    const clamped = this.clampXToRowSegments(desired, this.gridRow);
    return clamped - this.currentX;
  }

  private resetSpawnAndEntryPositions(): void {
    // Update grid geometry in case viewport changed
    this.updateGridGeometry();

    // Entry position is already set from grid in constructor
    // Just update the DOM position
    const fighterWidth = this.fighterEl.offsetWidth || 100;
    this.fighterEl.style.transition = 'none';
    this.fighterEl.style.left = `${this.currentX - fighterWidth / 2}px`;
    // Force style flush so subsequent transitions animate normally.
    void this.fighterEl.offsetHeight;
    this.fighterEl.style.transition = '';
  }

  private emitFootworkDust(distance: number, animation?: SpriteAnimation): void {
    if (!this.renderer) return;
    const travel = Math.abs(distance);
    const shouldEmit =
      (animation === 'dash' || animation === 'retreat' || animation === 'advance' || animation === 'strafe') &&
      travel > 6;
    if (!shouldEmit) return;

    const magnitude = Math.min(1.4, 0.45 + travel / 90);
    this.renderer.emitDustBurst(this.currentX, this.getRenderY(), magnitude);
  }

  private applyPosition(durationMs: number): void {
    const fighterWidth = this.fighterEl.offsetWidth || 100;
    const left = this.currentX - fighterWidth / 2;
    const deltaX = this.currentX - this.lastVisualX;
    const deltaRow = this.gridRow - this.lastGridRow;

    this.fighterEl.style.transition = `left ${durationMs}ms ease, transform ${durationMs}ms ease, bottom ${durationMs}ms ease`;
    this.fighterEl.style.left = `${left}px`;

    const nextDirection = this.computeDirection(deltaX, deltaRow);
    this.setDirection(nextDirection);
    this.lastVisualX = this.currentX;
    this.lastGridRow = this.gridRow;

    this.applyTransform();
    this.syncRenderer();
  }

  private computeDirection(deltaX: number, deltaLane: number): AnimationDirection {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaLane);

    if (absY > absX * 1.25) return 'front';
    if (absY > absX * 0.45) return 'oblique';
    return 'side';
  }

  private setDirection(direction: AnimationDirection): void {
    this.direction = direction;
    this.sprite.setDirection(direction);
  }

  private applyTransform(): void {
    // Calculate Y offset from grid position
    // The fighter element uses bottom positioning, so we adjust via transform
    const viewport = this.getViewport();
    const pixelY = this.getPixelY();
    // Convert from top-based Y to bottom-based offset
    // fighterEl has bottom: 30px by default, so we offset from there
    const baseBottom = 30;
    const targetBottom = viewport.height - pixelY;
    const yOffset = baseBottom - targetBottom;

    this.baseTransform = `translateY(${yOffset}px)`;
    const transforms = `${this.baseTransform} ${this.impulseTransform}`.trim();
    this.fighterEl.style.transform = transforms;
  }

  private applyRootMotion(distance: number, durationMs: number): void {
    if (durationMs <= 0) return;
    if (this.rootMotionTimeout) {
      window.clearTimeout(this.rootMotionTimeout);
    }

    this.extendTransformTransition(durationMs, 'cubic-bezier(0.22, 0.75, 0.3, 1)');
    const clampedDistance = this.clampRootMotion(distance);
    this.impulseTransform = `translateX(${clampedDistance}px)`;
    this.applyTransform();

    this.rootMotionTimeout = window.setTimeout(() => {
      this.extendTransformTransition(Math.max(140, durationMs * 0.6), 'ease-out');
      this.impulseTransform = '';
      this.applyTransform();
      this.rootMotionTimeout = null;
    }, durationMs);
  }

  private extendTransformTransition(durationMs: number, easing: string): void {
    const existing = this.fighterEl.style.transition
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part && !part.startsWith('transform'));

    existing.push(`transform ${durationMs}ms ${easing}`);
    this.fighterEl.style.transition = existing.join(', ');
  }

  private setFootworkAnimation(
    animation: SpriteAnimation,
    durationMs: number,
    options: AnimationOptions = {}
  ): void {
    if (this.footworkTimeout) {
      window.clearTimeout(this.footworkTimeout);
    }

    const merged: AnimationOptions = {
      direction: options.direction ?? this.direction,
      blend: true,
      ...options,
    };

    this.play(animation, merged);
    this.footworkTimeout = window.setTimeout(() => {
      // Avoid interrupting attack/hit/ko animations
      const current = this.sprite.getCurrentAnimation();
      if (
        current === 'attack' ||
        current === 'hit' ||
        current === 'block' ||
        current === 'parry' ||
        current === 'stagger' ||
        current === 'death' ||
        current === 'victory'
      ) {
        return;
      }
      this.play('idle', { direction: this.direction, blend: true });
    }, durationMs);
  }

  private registerEvents(): void {
    const staminaSub = eventBus.on<{ id: 'player' | 'enemy'; value: number; max: number }>(
      EVENTS.STAMINA_CHANGED,
      ({ id, value, max }) => {
        if (id !== this.id) return;
        this.updateStamina(value, max);
      }
    );
    this.subscriptions.push(staminaSub);
  }
}
