/**
 * EventBus - Centralized event system for loose coupling
 * Allows components to communicate without direct dependencies
 */

type EventCallback<T = unknown> = (data: T) => void;

interface EventSubscription {
  unsubscribe: () => void;
}

export class EventBus {
  private events: Map<string, EventCallback[]> = new Map();

  /**
   * Subscribe to an event
   */
  on<T = unknown>(eventName: string, callback: EventCallback<T>): EventSubscription {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }

    const callbacks = this.events.get(eventName)!;
    callbacks.push(callback as EventCallback);

    // Return subscription object with unsubscribe method
    return {
      unsubscribe: () => this.off(eventName, callback),
    };
  }

  /**
   * Subscribe to an event that fires only once
   */
  once<T = unknown>(eventName: string, callback: EventCallback<T>): EventSubscription {
    const onceCallback: EventCallback<T> = (data: T) => {
      callback(data);
      this.off(eventName, onceCallback);
    };

    return this.on(eventName, onceCallback);
  }

  /**
   * Unsubscribe from an event
   */
  off<T = unknown>(eventName: string, callback: EventCallback<T>): void {
    const callbacks = this.events.get(eventName);
    if (!callbacks) return;

    const index = callbacks.indexOf(callback as EventCallback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }

    // Clean up empty event arrays
    if (callbacks.length === 0) {
      this.events.delete(eventName);
    }
  }

  /**
   * Emit an event to all subscribers
   */
  emit<T = unknown>(eventName: string, data?: T): void {
    const callbacks = this.events.get(eventName);
    if (!callbacks) return;

    // Create a copy to avoid issues if callbacks modify the array
    [...callbacks].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event handler for "${eventName}":`, error);
      }
    });
  }

  /**
   * Remove all subscribers for an event
   */
  clear(eventName?: string): void {
    if (eventName) {
      this.events.delete(eventName);
    } else {
      this.events.clear();
    }
  }

  /**
   * Get the number of subscribers for an event
   */
  listenerCount(eventName: string): number {
    return this.events.get(eventName)?.length ?? 0;
  }

  /**
   * Get all event names
   */
  eventNames(): string[] {
    return Array.from(this.events.keys());
  }
}

// Create singleton instance
export const eventBus = new EventBus();

// Event name constants for type safety
export const EVENTS = {
  // Game flow
  GAME_START: 'game:start',
  GAME_RESET: 'game:reset',
  SCREEN_CHANGE: 'screen:change',

  // Selection
  GLADIATOR_SELECTED: 'gladiator:selected',
  BATTLE_START: 'battle:start',

  // Battle
  BATTLE_READY: 'battle:ready',
  TURN_START: 'turn:start',
  TURN_END: 'turn:end',
  ATTACK_START: 'attack:start',
  ATTACK_HIT: 'attack:hit',
  ATTACK_MISS: 'attack:miss',
  HITBOX_ACTIVE: 'hitbox:active',
  HURTBOX_HIT: 'hurtbox:hit',
  DAMAGE_DEALT: 'damage:dealt',
  FIGHTER_DEFEATED: 'fighter:defeated',
  BATTLE_END: 'battle:end',

  // Frame-level
  FRAME_START: 'frame:start',
  FRAME_STEP: 'frame:step',
  FRAME_END: 'frame:end',
  COMBAT_TICK: 'combat:tick',
  STAMINA_CHANGED: 'fighter:stamina',
  INITIATIVE_CHANGED: 'fighter:initiative',
  SPACING_UPDATE: 'spacing:update',

  // Results
  SHOW_RESULTS: 'results:show',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
