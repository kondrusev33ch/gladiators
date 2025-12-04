/**
 * Game - Main game controller
 * Coordinates all game systems and manages game flow
 */

import type { GameState, GameScreen } from '../types/game.types';
import type { Gladiator, Fighter } from '../types/gladiator.types';
import { stateMachine } from './StateMachine';
import { screenManager } from './ScreenManager';
import { eventBus, EVENTS } from './EventBus';

export class Game {
  private state: GameState;
  private battleInterval: number | null = null;

  constructor() {
    // Initialize game state
    this.state = {
      currentScreen: 'selection',
      selectedGladiator: null,
      player: null,
      enemy: null,
      turnCount: 0,
      isRunning: false,
      stats: {
        player: { damage: 0, crits: 0, dodges: 0, misses: 0 },
        enemy: { damage: 0, crits: 0, dodges: 0, misses: 0 },
      },
    };
  }

  /**
   * Initialize the game
   */
  init(): void {
    console.warn('🏛️ Initializing Gladiator Arena...');

    // Initialize managers
    screenManager.init();

    // Register state machine callbacks
    this.registerStateCallbacks();

    // Set initial screen
    screenManager.showScreen('selection');

    // Setup event listeners
    this.setupEventListeners();

    console.warn('✅ Game initialized successfully');
  }

  /**
   * Register state machine lifecycle callbacks
   */
  private registerStateCallbacks(): void {
    stateMachine.registerState('selection', {
      onEnter: async () => {
        console.warn('📋 Entering selection screen');
        this.resetState();
      },
    });

    stateMachine.registerState('battle', {
      onEnter: async () => {
        console.warn('⚔️ Entering battle screen');
      },
      onExit: async () => {
        console.warn('🏁 Exiting battle screen');
        this.stopBattle();
      },
    });

    stateMachine.registerState('results', {
      onEnter: async () => {
        console.warn('🏆 Entering results screen');
      },
    });
  }

  /**
   * Setup global event listeners
   */
  private setupEventListeners(): void {
    // Listen for gladiator selection
    eventBus.on<Gladiator>(EVENTS.GLADIATOR_SELECTED, gladiator => {
      this.selectGladiator(gladiator);
    });

    // Listen for battle start
    eventBus.on(EVENTS.BATTLE_START, () => {
      this.startBattle();
    });

    // Listen for game reset
    eventBus.on(EVENTS.GAME_RESET, () => {
      this.reset();
    });
  }

  /**
   * Select a gladiator
   */
  private selectGladiator(gladiator: Gladiator): void {
    this.state.selectedGladiator = gladiator;
    console.warn(`Selected: ${gladiator.name}`);
  }

  /**
   * Start a battle
   */
  private async startBattle(): Promise<void> {
    if (!this.state.selectedGladiator) {
      console.error('No gladiator selected');
      return;
    }

    // Transition to battle screen
    const success = await stateMachine.transitionTo('battle');
    if (!success) {
      console.error('Failed to transition to battle screen');
      return;
    }

    // Initialize fighters (will be implemented in combat phase)
    console.warn('Battle would start here...');
  }

  /**
   * Stop the battle
   */
  private stopBattle(): void {
    this.state.isRunning = false;
    if (this.battleInterval) {
      clearInterval(this.battleInterval);
      this.battleInterval = null;
    }
  }

  /**
   * Reset game to initial state
   */
  reset(): void {
    console.warn('🔄 Resetting game...');

    // Stop any running battle
    this.stopBattle();

    // Reset state
    this.resetState();

    // Transition to selection screen
    stateMachine.reset();
  }

  /**
   * Reset game state
   */
  private resetState(): void {
    this.state = {
      currentScreen: 'selection',
      selectedGladiator: null,
      player: null,
      enemy: null,
      turnCount: 0,
      isRunning: false,
      stats: {
        player: { damage: 0, crits: 0, dodges: 0, misses: 0 },
        enemy: { damage: 0, crits: 0, dodges: 0, misses: 0 },
      },
    };
  }

  /**
   * Get current game state (read-only)
   */
  getState(): Readonly<GameState> {
    return Object.freeze({ ...this.state });
  }

  /**
   * Get current screen
   */
  getCurrentScreen(): GameScreen {
    return stateMachine.getState();
  }

  /**
   * Create a fighter from a gladiator
   */
  createFighter(gladiator: Gladiator): Fighter {
    return {
      ...gladiator,
      currentHp: gladiator.stats.hp,
      maxHp: gladiator.stats.hp,
    };
  }
}

// Create singleton instance
export const game = new Game();
