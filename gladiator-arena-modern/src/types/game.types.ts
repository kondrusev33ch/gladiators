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
  DODGE_DISTANCE: number;
}

export interface ParticlesConfig {
  COUNT: number;
  MIN_SIZE: number;
  MAX_SIZE: number;
  DURATION: number;
}

export type LogType = 'hit' | 'crit' | 'miss' | 'system';
