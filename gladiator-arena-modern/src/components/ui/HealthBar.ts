/**
 * HealthBar - Displays fighter health with animated bar
 */

import { createElement } from '../../utils/dom';

export interface HealthBarOptions {
  maxHp: number;
  currentHp: number;
}

export class HealthBar {
  private container: HTMLElement;
  private barElement: HTMLElement;
  private maxHp: number;
  private currentHp: number;

  constructor(container: HTMLElement, options: HealthBarOptions) {
    this.container = container;
    this.maxHp = options.maxHp;
    this.currentHp = options.currentHp;
    this.barElement = this.createHealthBar();
    this.render();
  }

  /**
   * Create the health bar HTML structure
   */
  private createHealthBar(): HTMLElement {
    const wrapper = createElement('div', {
      className: 'fighter__health',
    });

    const bar = createElement('div', {
      className: 'fighter__health-bar',
    });

    wrapper.appendChild(bar);
    this.container.appendChild(wrapper);

    return bar;
  }

  /**
   * Update the health bar display
   */
  private render(): void {
    const percentage = Math.max(0, (this.currentHp / this.maxHp) * 100);
    this.barElement.style.width = `${percentage}%`;

    // Change color based on health level
    if (percentage <= 25) {
      this.barElement.style.background = 'var(--color-health-low)';
    } else {
      this.barElement.style.background = 'var(--color-health)';
    }
  }

  /**
   * Update current health
   */
  setHealth(currentHp: number): void {
    this.currentHp = Math.max(0, Math.min(currentHp, this.maxHp));
    this.render();
  }

  /**
   * Get current health
   */
  getHealth(): number {
    return this.currentHp;
  }

  /**
   * Get max health
   */
  getMaxHealth(): number {
    return this.maxHp;
  }

  /**
   * Check if fighter is alive
   */
  isAlive(): boolean {
    return this.currentHp > 0;
  }

  /**
   * Destroy the health bar
   */
  destroy(): void {
    this.barElement.parentElement?.remove();
  }
}
