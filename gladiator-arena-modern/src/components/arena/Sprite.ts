/**
 * Sprite - Renders and animates gladiator sprites
 */

import type { WeaponType } from '../../types/gladiator.types';
import { createElement } from '../../utils/dom';

export type SpriteAnimation =
  | 'idle'
  | 'walk'
  | 'advance'
  | 'retreat'
  | 'strafe'
  | 'dash'
  | 'attack'
  | 'block'
  | 'parry'
  | 'stagger'
  | 'hit'
  | 'death'
  | 'victory';

export class Sprite {
  private container: HTMLElement;
  private spriteElement: HTMLElement | null = null;
  private currentAnimation: SpriteAnimation = 'idle';

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Create sprite HTML structure
   */
  create(weapon: WeaponType, isFlipped: boolean = false): void {
    const weaponClass = `weapon--${weapon}`;
    const flipClass = isFlipped ? 'sprite--flipped' : '';

    this.spriteElement = createElement('div', {
      className: `sprite sprite--idle ${flipClass}`,
      innerHTML: `
        <div class="sprite__part sprite__leg sprite__leg--left"></div>
        <div class="sprite__part sprite__leg sprite__leg--right"></div>
        <div class="sprite__part sprite__torso">
          <div class="sprite__armor"></div>
          <div class="sprite__skirt"></div>
        </div>
        <div class="sprite__part sprite__head">
          <div class="sprite__helmet">
            <div class="sprite__plume"></div>
          </div>
        </div>
        <div class="sprite__part sprite__arm sprite__arm--left">
          <div class="sprite__shield"></div>
        </div>
        <div class="sprite__part sprite__arm sprite__arm--right">
          <div class="sprite__weapon ${weaponClass}"></div>
        </div>
      `,
    });

    this.container.appendChild(this.spriteElement);
  }

  /**
   * Set animation state
   */
  setAnimation(animation: SpriteAnimation): void {
    if (!this.spriteElement) return;

    // Remove all animation classes
    this.spriteElement.classList.remove(
      'sprite--idle',
      'sprite--walk',
      'sprite--advance',
      'sprite--retreat',
      'sprite--strafe',
      'sprite--dash',
      'sprite--attack',
      'sprite--block',
      'sprite--parry',
      'sprite--stagger',
      'sprite--hit',
      'sprite--death',
      'sprite--victory'
    );

    // Force reflow to restart animation
    void this.spriteElement.offsetHeight;

    // Add new animation class
    this.spriteElement.classList.add(`sprite--${animation}`);
    this.currentAnimation = animation;
  }

  /**
   * Get current animation
   */
  getCurrentAnimation(): SpriteAnimation {
    return this.currentAnimation;
  }

  /**
   * Flip the sprite horizontally
   */
  setFlipped(flipped: boolean): void {
    if (!this.spriteElement) return;

    if (flipped) {
      this.spriteElement.classList.add('sprite--flipped');
    } else {
      this.spriteElement.classList.remove('sprite--flipped');
    }
  }

  /**
   * Destroy sprite
   */
  destroy(): void {
    if (this.spriteElement) {
      this.spriteElement.remove();
      this.spriteElement = null;
    }
  }
}
