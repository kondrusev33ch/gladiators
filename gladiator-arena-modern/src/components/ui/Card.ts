/**
 * Card - Gladiator selection card component
 */

import type { Gladiator } from '../../types/gladiator.types';
import { createElement } from '../../utils/dom';

export interface CardOptions {
  gladiator: Gladiator;
  selected?: boolean;
  onSelect?: (gladiator: Gladiator) => void;
}

export class Card {
  private element: HTMLElement;
  private gladiator: Gladiator;
  private selected: boolean;
  private selectHandler?: (gladiator: Gladiator) => void;

  constructor(options: CardOptions) {
    const { gladiator, selected = false, onSelect } = options;
    this.gladiator = gladiator;
    this.selected = selected;
    this.selectHandler = onSelect;
    this.element = this.createCard();
  }

  /**
   * Create the card HTML structure
   */
  private createCard(): HTMLElement {
    const card = createElement('div', {
      className: this.getCardClasses(),
    });

    // Icon
    const icon = createElement('span', {
      className: 'gladiator-card__icon',
      textContent: this.gladiator.icon,
    });

    // Name
    const name = createElement('h3', {
      className: 'gladiator-card__name',
      textContent: this.gladiator.name,
    });

    // Stats
    const stats = this.gladiator.stats;
    const statsText = `STR: ${stats.str} | AGI: ${stats.agi}\nDEF: ${stats.def} | ACC: ${stats.acc}\nHP: ${stats.hp}`;

    const statsElement = createElement('div', {
      className: 'gladiator-card__stats',
      innerHTML: statsText.replace(/\n/g, '<br>'),
    });

    // Append all elements
    card.appendChild(icon);
    card.appendChild(name);
    card.appendChild(statsElement);

    // Add click handler
    card.addEventListener('click', this.handleClick.bind(this));

    return card;
  }

  /**
   * Get card CSS classes based on state
   */
  private getCardClasses(): string {
    const classes = ['gladiator-card'];
    if (this.selected) {
      classes.push('gladiator-card--selected');
    }
    return classes.join(' ');
  }

  /**
   * Handle card click
   */
  private handleClick(): void {
    if (this.selectHandler) {
      this.selectHandler(this.gladiator);
    }
  }

  /**
   * Get the DOM element
   */
  getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Set selected state
   */
  setSelected(selected: boolean): void {
    this.selected = selected;
    this.element.className = this.getCardClasses();
  }

  /**
   * Get selected state
   */
  isSelected(): boolean {
    return this.selected;
  }

  /**
   * Get the gladiator data
   */
  getGladiator(): Gladiator {
    return this.gladiator;
  }

  /**
   * Destroy the card and remove event listeners
   */
  destroy(): void {
    this.element.removeEventListener('click', this.handleClick.bind(this));
    this.element.remove();
  }
}
