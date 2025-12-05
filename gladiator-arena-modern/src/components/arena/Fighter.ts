/**
 * Fighter - Manages a fighter in the arena
 */

import type { Fighter as FighterData } from '../../types/gladiator.types';
import type { SpriteAnimation } from './Sprite';
import { Sprite } from './Sprite';
import { createElement } from '../../utils/dom';
import { MOVEMENT } from '../../data/config';
import { clamp } from '../../utils/math';

type Direction = 'left' | 'right';

export class Fighter {
  private container: HTMLElement;
  private sprite: Sprite;
  private data: FighterData;
  private isPlayer: boolean;
  private arenaWidth: number;

  private currentX: number;
  private entryX: number;
  private laneIndex: number;
  private laneOffsets: number[];
  private baseTransform = '';
  private impulseTransform = '';
  private footworkTimeout: number | null = null;

  private nameEl!: HTMLElement;
  private healthBarEl!: HTMLElement;
  private damageEl!: HTMLElement;
  private spriteContainer!: HTMLElement;
  private fighterEl!: HTMLElement;

  constructor(
    arena: HTMLElement,
    data: FighterData,
    isPlayer: boolean
  ) {
    this.container = arena;
    this.data = data;
    this.isPlayer = isPlayer;
    this.arenaWidth = Math.max(640, this.container.clientWidth || 0);
    this.laneOffsets = MOVEMENT.LANES;
    this.laneIndex = clamp(
      Math.floor(this.laneOffsets.length / 2),
      0,
      this.laneOffsets.length - 1
    );

    // X is tracked as the fighter's center position in px relative to the arena
    this.currentX = this.isPlayer ? -160 : this.arenaWidth + 160;
    this.entryX = this.isPlayer ? this.arenaWidth * 0.2 : this.arenaWidth * 0.8;

    // Create sprite instance
    this.spriteContainer = createElement('div');
    this.sprite = new Sprite(this.spriteContainer);

    this.createFighterElement();
  }

  /**
   * Create fighter HTML structure
   */
  private createFighterElement(): void {
    this.fighterEl = createElement('div', {
      className: `absolute bottom-[30px] w-[100px] text-center z-10 transition-all duration-1000 ease-out`,
      attributes: {
        'data-fighter': this.isPlayer ? 'player' : 'enemy',
      },
    });

    // Set initial off-screen position using inline styles (center-based)
    const fighterWidth = this.fighterEl.offsetWidth || 100;
    this.fighterEl.style.left = `${this.currentX - fighterWidth / 2}px`;

    // Name
    this.nameEl = createElement('div', {
      className: 'font-cinzel text-xs font-semibold text-white bg-black/70 px-2 py-0.5 rounded inline-block mb-1',
      textContent: this.data.name,
    });

    // Health bar container
    const healthContainer = createElement('div', {
      className: 'w-[110%] -ml-[5%] h-3 bg-[#222] border-2 border-[#111] rounded overflow-hidden mb-2',
      innerHTML: '<div class="fighter__health-bar w-full h-full bg-[#2d5a27] transition-all duration-300"></div>',
    });
    this.healthBarEl = healthContainer.querySelector('.fighter__health-bar') as HTMLElement;

    // Damage display
    this.damageEl = createElement('div', {
      className: 'absolute top-[-40px] left-1/2 -translate-x-1/2 font-cinzel font-bold text-3xl pointer-events-none z-30 opacity-0',
      attributes: { 'data-damage': '' },
    });

    // Append elements
    this.fighterEl.appendChild(this.nameEl);
    this.fighterEl.appendChild(healthContainer);
    this.fighterEl.appendChild(this.damageEl);
    this.fighterEl.appendChild(this.spriteContainer);

    this.container.appendChild(this.fighterEl);

    this.applyTransform();

    // Create sprite - player faces right, enemy faces left during entrance
    this.sprite.create(this.data.weapon, !this.isPlayer);
  }

  /**
   * Enter the arena (walk in animation)
   */
  enter(): void {
    setTimeout(() => {
      this.sprite.setAnimation('walk');
      this.moveToX(this.entryX, 900);

      // After entrance, turn enemy to face player (flip from left to right)
      if (!this.isPlayer) {
        setTimeout(() => {
          this.sprite.setFlipped(false);
        }, 1000);
      }
    }, 100);
  }

  /**
   * Stop walking and go idle
   */
  idle(): void {
    this.sprite.setAnimation('idle');
  }

  /**
   * Perform attack animation
   */
  attack(): void {
    this.sprite.setAnimation('attack');

    const lungeDistance = MOVEMENT.LUNGE_DISTANCE * (this.isPlayer ? 1 : -1);
    this.setImpulse(lungeDistance, 300);
    setTimeout(() => {
      this.clearImpulse();
      this.sprite.setAnimation('idle');
    }, 300);
  }

  /**
   * Play hit animation
   */
  hit(): void {
    this.sprite.setAnimation('hit');
    setTimeout(() => {
      if (this.data.currentHp > 0) {
        this.sprite.setAnimation('idle');
      }
    }, 400);
  }

  /**
   * Play death animation
   */
  death(): void {
    this.sprite.setAnimation('death');
  }

  /**
   * Play victory animation
   */
  victory(): void {
    this.sprite.setAnimation('victory');
  }

  /**
   * Show damage number
   */
  showDamage(amount: number, isCrit: boolean): void {
    this.damageEl.textContent = amount.toString();
    this.damageEl.style.color = isCrit ? '#ff1744' : '#8b1a1a';
    this.damageEl.style.fontSize = isCrit ? '2.8rem' : '2rem';
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

    return {
      x: rect.left - arenaRect.left + rect.width / 2,
      y: rect.top - arenaRect.top + rect.height / 2,
    };
  }

  /**
   * Dodge or dash animation with directionality
   */
  dodge(direction: Direction, distance: number = MOVEMENT.DODGE.DISTANCE): number {
    const delta = direction === 'left' ? -distance : distance;
    const moved = this.moveBy(delta, 180, 'retreat');
    this.setImpulse(delta * 0.35, 180);
    setTimeout(() => this.clearImpulse(), 200);
    return moved;
  }

  dash(direction: Direction, distance: number = MOVEMENT.DASH.DISTANCE): number {
    const delta = direction === 'left' ? -distance : distance;
    const moved = this.moveBy(delta, 180, 'dash');
    this.setImpulse(delta * 0.2, 200);
    setTimeout(() => this.clearImpulse(), 220);
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
    const nextLane = clamp(this.laneIndex + direction, 0, this.laneOffsets.length - 1);
    if (nextLane === this.laneIndex) return false;
    this.laneIndex = nextLane;
    this.applyPosition(200);
    this.setFootworkAnimation('strafe', 320);
    return true;
  }

  getCenterX(): number {
    return this.currentX;
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.sprite.destroy();
    this.fighterEl.remove();
    if (this.footworkTimeout) {
      clearTimeout(this.footworkTimeout);
      this.footworkTimeout = null;
    }
  }

  private moveToX(x: number, durationMs: number): void {
    this.currentX = x;
    this.applyPosition(durationMs);
  }

  private moveBy(deltaX: number, durationMs: number, animation?: SpriteAnimation): number {
    const halfWidth = this.getHalfWidth();
    const minX = MOVEMENT.ARENA_PADDING + halfWidth;
    const maxX = this.arenaWidth - MOVEMENT.ARENA_PADDING - halfWidth;
    const nextX = clamp(this.currentX + deltaX, minX, maxX);
    const applied = nextX - this.currentX;

    if (applied === 0) return 0;

    this.currentX = nextX;
    this.applyPosition(durationMs);

    if (animation) {
      this.setFootworkAnimation(animation, durationMs + 120);
    }

    return applied;
  }

  private getHalfWidth(): number {
    return (this.fighterEl?.offsetWidth || 100) / 2;
  }

  private applyPosition(durationMs: number): void {
    const fighterWidth = this.fighterEl.offsetWidth || 100;
    const left = this.currentX - fighterWidth / 2;
    this.fighterEl.style.transition = `left ${durationMs}ms ease, transform ${durationMs}ms ease`;
    this.fighterEl.style.left = `${left}px`;
    this.applyTransform();
  }

  private applyTransform(): void {
    const laneOffset = this.laneOffsets[this.laneIndex] ?? 0;
    this.baseTransform = `translateY(${laneOffset}px)`;
    const transforms = `${this.baseTransform} ${this.impulseTransform}`.trim();
    this.fighterEl.style.transform = transforms;
  }

  private setImpulse(offsetX: number, durationMs: number): void {
    this.fighterEl.style.transition = `transform ${durationMs}ms ease`;
    this.impulseTransform = `translateX(${offsetX}px)`;
    this.applyTransform();
  }

  private clearImpulse(): void {
    this.impulseTransform = '';
    this.applyTransform();
  }

  private setFootworkAnimation(animation: SpriteAnimation, durationMs: number): void {
    if (this.footworkTimeout) {
      clearTimeout(this.footworkTimeout);
    }

    this.sprite.setAnimation(animation);
    this.footworkTimeout = window.setTimeout(() => {
      // Avoid interrupting attack/hit/ko animations
      const current = this.sprite.getCurrentAnimation();
      if (current === 'attack' || current === 'hit' || current === 'death' || current === 'victory') {
        return;
      }
      this.sprite.setAnimation('idle');
    }, durationMs);
  }
}
