/**
 * Type definitions for game state and screens
 */

import type { Gladiator, Fighter } from './gladiator.types';
import type { BattleStats } from './combat.types';

export type GameScreen = 'selection' | 'battle' | 'results';

export interface GameState {
  currentScreen: GameScreen;
  selectedGladiator: Gladiator | null;
  player: Fighter | null;
  enemy: Fighter | null;
  turnCount: number;
  isRunning: boolean;
  stats: {
    player: BattleStats;
    enemy: BattleStats;
  };
}

export interface TimingConfig {
  WALK_IN_DELAY: number;
  FIGHT_START_DELAY: number;
  TURN_INTERVAL: number;
  ATTACK_DURATION: number;
  LUNGE_DURATION: number;
  HIT_DELAY: number;
  DEATH_DELAY: number;
  RESULTS_DELAY: number;
}

export interface MovementConfig {
  LUNGE_DISTANCE: number;
  ARENA_PADDING: number;
  LANES: number[];
  FOOTWORK: {
    SPEED: number; // Forward shuffle speed (cells per second)
    BACKPEDAL_SPEED: number; // Retreat speed (cells per second)
    STRAFE_DISTANCE: number; // Lateral lane change distance (px)
    COST_PER_SECOND: number; // Stamina drain while moving (per second of movement)
  };
  DODGE: {
    DISTANCE: number;
    STAMINA_COST: number;
    IFRAMES: number;
  };
  DASH: {
    DISTANCE: number;
    STAMINA_COST: number;
    IFRAMES: number;
  };
}

export interface ParticlesConfig {
  COUNT: number;
  MIN_SIZE: number;
  MAX_SIZE: number;
  DURATION: number;
}

export interface HitStopConfig {
  freezeDuration: number;
  slowDuration: number;
  slowScale: number;
}

export interface EffectsConfig {
  HEAVY_HIT_THRESHOLD: number;
  CRIT_HITSTOP: HitStopConfig;
  PARRY_HITSTOP: HitStopConfig;
  EXECUTION_HITSTOP: HitStopConfig;
  CAMERA_SHAKE_INTENSITY: number;
  CAMERA_SHAKE_MIN: number;
  CHROMATIC_DURATION: number;
}

export type SpacingBand = 'out-of-range' | 'sweet-spot' | 'danger-zone';

export interface SpacingStatus {
  distance: number;
  player: SpacingBand;
  enemy: SpacingBand;
}

export type LogType = 'hit' | 'crit' | 'miss' | 'system';
