/**
 * CombatLog - Displays battle messages
 */

import type { LogType } from '../../types/game.types';
import { createElement } from '../../utils/dom';

export class CombatLog {
  private container: HTMLElement;
  private readonly maxEntries = 120;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clear();
  }

  /**
   * Add a log entry
   */
  log(message: string, type: LogType = 'system'): void {
    const entry = createElement('div', {
      className: `py-1 border-b border-black/15 last:border-b-0 combat-log__${type}`,
      innerHTML: message,
    });

    // Check if user is near the bottom before adding new entry
    const isNearBottom =
      this.container.scrollHeight - this.container.scrollTop - this.container.clientHeight < 50;

    this.container.appendChild(entry);

    // Trim old entries to avoid unbounded DOM growth during long sessions
    this.trimOverflow();

    // Only auto-scroll if user was already near the bottom
    if (isNearBottom) {
      this.container.scrollTop = this.container.scrollHeight;
    }
  }

  /**
   * Clear all log entries
   */
  clear(): void {
    this.container.innerHTML = '';
  }

  /**
   * Remove oldest entries beyond the max limit
   */
  private trimOverflow(): void {
    const excess = this.container.children.length - this.maxEntries;
    for (let i = 0; i < excess; i++) {
      const first = this.container.firstElementChild;
      if (first) {
        this.container.removeChild(first);
      }
    }
  }
}
