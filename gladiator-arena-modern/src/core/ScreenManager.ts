/**
 * ScreenManager - Handles DOM screen visibility and transitions
 */

import type { GameScreen } from '../types/game.types';
import { $required, hide, show, addClass } from '../utils/dom';
import { eventBus, EVENTS } from './EventBus';

export class ScreenManager {
  private screens: Map<GameScreen, HTMLElement> = new Map();
  private currentScreen: GameScreen | null = null;

  /**
   * Initialize and register all screens
   */
  init(): void {
    // Register screens
    this.registerScreen('selection', '#screen-selection');
    this.registerScreen('battle', '#screen-battle');
    this.registerScreen('results', '#screen-results');

    // Listen for screen change events
    eventBus.on<{ from: GameScreen; to: GameScreen }>(
      EVENTS.SCREEN_CHANGE,
      ({ to }) => {
        this.showScreen(to);
      }
    );
  }

  /**
   * Register a screen element
   */
  private registerScreen(name: GameScreen, selector: string): void {
    try {
      const element = $required(selector);
      this.screens.set(name, element);
    } catch (error) {
      console.error(`Failed to register screen "${name}":`, error);
    }
  }

  /**
   * Show a specific screen and hide others
   */
  showScreen(screenName: GameScreen): void {
    // Hide all screens first
    this.screens.forEach((element, name) => {
      if (name === screenName) {
        show(element);
        addClass(element, 'screen-fade-in');
        this.currentScreen = screenName;
      } else {
        hide(element);
      }
    });
  }

  /**
   * Get current screen element
   */
  getCurrentScreen(): HTMLElement | null {
    if (!this.currentScreen) return null;
    return this.screens.get(this.currentScreen) ?? null;
  }

  /**
   * Get screen element by name
   */
  getScreen(name: GameScreen): HTMLElement | null {
    return this.screens.get(name) ?? null;
  }
}

// Create singleton instance
export const screenManager = new ScreenManager();
