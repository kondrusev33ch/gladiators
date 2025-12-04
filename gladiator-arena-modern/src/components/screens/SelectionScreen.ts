/**
 * SelectionScreen - Gladiator selection interface
 */

import type { Gladiator } from '../../types/gladiator.types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { GLADIATORS } from '../../data/gladiators';
import { createElement, $required } from '../../utils/dom';
import { eventBus, EVENTS } from '../../core/EventBus';

export class SelectionScreen {
  private container: HTMLElement;
  private cards: Card[] = [];
  private selectedCard: Card | null = null;
  private fightButton: Button | null = null;
  private infoElement: HTMLElement | null = null;

  constructor(containerId: string = '#screen-selection') {
    this.container = $required(containerId);
    this.init();
  }

  /**
   * Initialize the selection screen
   */
  private init(): void {
    this.container.innerHTML = '';
    // Don't replace className, just ensure it has the right classes
    this.container.classList.remove('hidden');
    this.container.classList.add('screen', 'flex', 'flex-col', 'p-4', 'overflow-y-auto');

    // Create title section
    const titleSection = createElement('div', {
      className: 'text-center mb-4',
      innerHTML: `
        <h2 class="mb-2">Choose Your Champion</h2>
        <p class="text-xs text-ink-light font-crimson italic">
          Select a gladiator to enter the arena
        </p>
      `,
    });

    // Create gladiator grid
    const gridContainer = createElement('div', {
      className: 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-4',
    });

    // Create info area
    this.infoElement = createElement('div', {
      className: 'selection__info text-center min-h-[50px] p-2 font-semibold text-blood',
    });

    // Create button container
    const buttonContainer = createElement('div', {
      className: 'flex justify-center mt-auto',
    });

    // Render gladiator cards
    this.renderCards(gridContainer);

    // Create fight button
    this.fightButton = new Button({
      text: 'Enter Arena',
      variant: 'primary',
      disabled: true,
      onClick: () => this.handleFightClick(),
    });

    buttonContainer.appendChild(this.fightButton.getElement());

    // Append all sections
    this.container.appendChild(titleSection);
    this.container.appendChild(gridContainer);
    this.container.appendChild(this.infoElement);
    this.container.appendChild(buttonContainer);
  }

  /**
   * Render gladiator cards
   */
  private renderCards(gridContainer: HTMLElement): void {
    this.cards = GLADIATORS.map(gladiator => {
      const card = new Card({
        gladiator,
        selected: false,
        onSelect: (g: Gladiator) => this.handleCardSelect(g),
      });
      gridContainer.appendChild(card.getElement());
      return card;
    });
  }

  /**
   * Handle card selection
   */
  private handleCardSelect(gladiator: Gladiator): void {
    // Deselect all cards
    this.cards.forEach(card => card.setSelected(false));

    // Select the clicked card
    const selectedCard = this.cards.find(
      card => card.getGladiator().id === gladiator.id
    );

    if (selectedCard) {
      selectedCard.setSelected(true);
      this.selectedCard = selectedCard;

      // Update info text
      if (this.infoElement) {
        this.infoElement.innerHTML = `
          <strong>${gladiator.name}</strong>: ${gladiator.description}
        `;
      }

      // Enable fight button
      this.fightButton?.setDisabled(false);

      // Emit selection event
      eventBus.emit(EVENTS.GLADIATOR_SELECTED, gladiator);
    }
  }

  /**
   * Handle fight button click
   */
  private handleFightClick(): void {
    if (this.selectedCard) {
      eventBus.emit(EVENTS.BATTLE_START);
    }
  }

  /**
   * Reset the screen
   */
  reset(): void {
    this.cards.forEach(card => card.setSelected(false));
    this.selectedCard = null;
    this.fightButton?.setDisabled(true);
    if (this.infoElement) {
      this.infoElement.innerHTML = '';
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.cards.forEach(card => card.destroy());
    this.cards = [];
    this.fightButton?.destroy();
    this.container.innerHTML = '';
  }
}
