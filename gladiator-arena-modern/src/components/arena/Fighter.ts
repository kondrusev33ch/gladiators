/**
 * Fighter - Manages a fighter in the arena
 */

import type { Fighter as FighterData } from '../../types/gladiator.types';
import { Sprite } from './Sprite';
import { createElement } from '../../utils/dom';

export class Fighter {
  private container: HTMLElement;
  private sprite: Sprite;
  private data: FighterData;
  private isPlayer: boolean;

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

    // Set initial off-screen position using inline styles
    if (this.isPlayer) {
      this.fighterEl.style.left = '-120px';
    } else {
      this.fighterEl.style.right = '-120px';
    }

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

    // Create sprite - player faces right, enemy faces left during entrance
    this.sprite.create(this.data.weapon, !this.isPlayer);
  }

  /**
   * Enter the arena (walk in animation)
   */
  enter(): void {
    setTimeout(() => {
      if (this.isPlayer) {
        this.fighterEl.style.left = '15%';
      } else {
        this.fighterEl.style.right = '15%';
      }
      this.sprite.setAnimation('walk');

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

    // Lunge forward
    const lungeDistance = 60;
    this.fighterEl.style.transition = 'transform 300ms ease-out';
    this.fighterEl.style.transform = this.isPlayer
      ? `translateX(${lungeDistance}px)`
      : `translateX(-${lungeDistance}px)`;

    // Return to position
    setTimeout(() => {
      this.fighterEl.style.transform = '';
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
   * Dodge animation
   */
  dodge(): void {
    const dodgeDistance = 25;
    this.fighterEl.style.transition = 'transform 200ms ease-out';
    this.fighterEl.style.transform = this.isPlayer
      ? `translateX(-${dodgeDistance}px)`
      : `translateX(${dodgeDistance}px)`;

    setTimeout(() => {
      this.fighterEl.style.transform = '';
    }, 200);
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.sprite.destroy();
    this.fighterEl.remove();
  }
}
