/**
 * StateMachine - Manages game states and screen transitions
 * Ensures valid state transitions and provides lifecycle hooks
 */

import type { GameScreen } from '../types/game.types';
import { eventBus, EVENTS } from './EventBus';

interface StateTransition {
  from: GameScreen;
  to: GameScreen;
}

interface StateConfig {
  onEnter?: () => void | Promise<void>;
  onExit?: () => void | Promise<void>;
}

export class StateMachine {
  private currentState: GameScreen;
  private states: Map<GameScreen, StateConfig> = new Map();
  private validTransitions: Map<GameScreen, Set<GameScreen>> = new Map();
  private isTransitioning = false;

  constructor(initialState: GameScreen = 'selection') {
    this.currentState = initialState;
    this.setupValidTransitions();
  }

  /**
   * Define valid state transitions
   */
  private setupValidTransitions(): void {
    // Selection can go to Battle
    this.validTransitions.set('selection', new Set(['battle']));

    // Battle can go to Results
    this.validTransitions.set('battle', new Set(['results']));

    // Results can go back to Selection
    this.validTransitions.set('results', new Set(['selection']));
  }

  /**
   * Register a state with lifecycle callbacks
   */
  registerState(state: GameScreen, config: StateConfig): void {
    this.states.set(state, config);
  }

  /**
   * Get current state
   */
  getState(): GameScreen {
    return this.currentState;
  }

  /**
   * Check if a transition is valid
   */
  canTransitionTo(newState: GameScreen): boolean {
    const validStates = this.validTransitions.get(this.currentState);
    return validStates?.has(newState) ?? false;
  }

  /**
   * Transition to a new state
   */
  async transitionTo(newState: GameScreen): Promise<boolean> {
    // Prevent concurrent transitions
    if (this.isTransitioning) {
      console.warn('Transition already in progress');
      return false;
    }

    // Validate transition
    if (!this.canTransitionTo(newState)) {
      console.error(
        `Invalid transition from "${this.currentState}" to "${newState}"`
      );
      return false;
    }

    this.isTransitioning = true;
    const oldState = this.currentState;

    try {
      // Execute exit callback for current state
      const currentStateConfig = this.states.get(this.currentState);
      if (currentStateConfig?.onExit) {
        await currentStateConfig.onExit();
      }

      // Update state
      this.currentState = newState;

      // Execute enter callback for new state
      const newStateConfig = this.states.get(newState);
      if (newStateConfig?.onEnter) {
        await newStateConfig.onEnter();
      }

      // Emit event
      eventBus.emit<StateTransition>(EVENTS.SCREEN_CHANGE, {
        from: oldState,
        to: newState,
      });

      return true;
    } catch (error) {
      console.error('Error during state transition:', error);
      // Rollback on error
      this.currentState = oldState;
      return false;
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * Force a state change (bypasses validation)
   * Use with caution - primarily for reset scenarios
   */
  forceState(newState: GameScreen): void {
    const oldState = this.currentState;
    this.currentState = newState;

    eventBus.emit<StateTransition>(EVENTS.SCREEN_CHANGE, {
      from: oldState,
      to: newState,
    });
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.forceState('selection');
  }
}

// Create singleton instance
export const stateMachine = new StateMachine();
