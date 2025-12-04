/**
 * ResultsScreen - Battle results and statistics display
 */

import type { BattleStats } from '../../types/combat.types';
import { Button } from '../ui/Button';
import { createElement, $required } from '../../utils/dom';
import { eventBus, EVENTS } from '../../core/EventBus';

export interface ResultsData {
  winner: 'player' | 'enemy';
  turnCount: number;
  playerStats: BattleStats;
  enemyStats: BattleStats;
  playerName: string;
  enemyName: string;
}

export class ResultsScreen {
  private container: HTMLElement;
  private titleElement: HTMLElement | null = null;
  private statsTable: HTMLElement | null = null;
  private resetButton: Button | null = null;

  constructor(containerId: string = '#screen-results') {
    this.container = $required(containerId);
    this.init();
  }

  /**
   * Initialize the results screen
   */
  private init(): void {
    this.container.innerHTML = '';
    // Don't replace className, just ensure it has the right classes
    this.container.classList.add('screen', 'flex', 'flex-col', 'p-4', 'gap-6');

    // Create title
    this.titleElement = createElement('h2', {
      className: 'results__title text-center text-4xl md:text-5xl mb-4',
    });

    // Create subtitle
    const subtitle = createElement('p', {
      className: 'results__subtitle text-center italic text-ink-light mb-6',
      textContent: 'The crowd roars! Here are the battle statistics.',
    });

    // Create stats table
    this.statsTable = this.createStatsTable();

    // Create button container
    const buttonContainer = createElement('div', {
      className: 'flex justify-center mt-auto',
    });

    // Create reset button
    this.resetButton = new Button({
      text: 'Fight Again',
      variant: 'primary',
      onClick: () => this.handleResetClick(),
    });

    buttonContainer.appendChild(this.resetButton.getElement());

    // Append all sections
    this.container.appendChild(this.titleElement);
    this.container.appendChild(subtitle);
    this.container.appendChild(this.statsTable);
    this.container.appendChild(buttonContainer);
  }

  /**
   * Create the statistics table
   */
  private createStatsTable(): HTMLElement {
    const table = createElement('table', {
      className: 'stats-table w-full max-w-2xl mx-auto bg-white/20 border-2 border-gold rounded overflow-hidden',
      innerHTML: `
        <thead>
          <tr class="bg-gold/30 text-ink">
            <th class="p-3 text-left font-cinzel text-sm uppercase tracking-wider">Statistic</th>
            <th class="p-3 text-center font-cinzel text-sm uppercase tracking-wider">You</th>
            <th class="p-3 text-center font-cinzel text-sm uppercase tracking-wider">Opponent</th>
          </tr>
        </thead>
        <tbody id="stats-body" class="text-ink-light">
        </tbody>
      `,
    });

    return table;
  }

  /**
   * Display results
   */
  showResults(data: ResultsData): void {
    // Update title based on winner
    if (this.titleElement) {
      if (data.winner === 'player') {
        this.titleElement.textContent = 'VICTORY!';
        this.titleElement.className = 'results__title results__title--victory text-center text-4xl md:text-5xl mb-4';
        this.titleElement.style.color = '#2d5a27'; // --color-health
      } else {
        this.titleElement.textContent = 'DEFEAT';
        this.titleElement.className = 'results__title results__title--defeat text-center text-4xl md:text-5xl mb-4';
        this.titleElement.style.color = '#8b1a1a'; // --color-blood
      }
    }

    // Populate stats table
    this.populateStats(data);
  }

  /**
   * Populate the statistics table
   */
  private populateStats(data: ResultsData): void {
    const tbody = this.statsTable?.querySelector('#stats-body');
    if (!tbody) return;

    const stats = [
      {
        label: 'Fighter',
        player: data.playerName,
        enemy: data.enemyName,
      },
      {
        label: 'Total Damage Dealt',
        player: data.playerStats.damage,
        enemy: data.enemyStats.damage,
      },
      {
        label: 'Critical Hits',
        player: data.playerStats.crits,
        enemy: data.enemyStats.crits,
      },
      {
        label: 'Attacks Dodged',
        player: data.playerStats.dodges,
        enemy: data.enemyStats.dodges,
      },
      {
        label: 'Attacks Missed',
        player: data.playerStats.misses,
        enemy: data.enemyStats.misses,
      },
      {
        label: 'Turns to Victory',
        player: data.turnCount,
        enemy: data.turnCount,
      },
    ];

    tbody.innerHTML = stats
      .map(
        (stat, index) => `
      <tr class="${index % 2 === 0 ? 'bg-black/5' : ''}">
        <td class="p-3 font-semibold text-ink">${stat.label}</td>
        <td class="p-3 text-center">${stat.player}</td>
        <td class="p-3 text-center">${stat.enemy}</td>
      </tr>
    `
      )
      .join('');
  }

  /**
   * Handle reset button click
   */
  private handleResetClick(): void {
    eventBus.emit(EVENTS.GAME_RESET);
  }

  /**
   * Reset the screen
   */
  reset(): void {
    if (this.titleElement) {
      this.titleElement.textContent = '';
    }
    const tbody = this.statsTable?.querySelector('#stats-body');
    if (tbody) {
      tbody.innerHTML = '';
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.resetButton?.destroy();
    this.container.innerHTML = '';
  }
}
