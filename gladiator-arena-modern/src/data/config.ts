/**
 * Game configuration and constants
 */

import type { TimingConfig, MovementConfig, ParticlesConfig } from '../types/game.types';
import type { CombatConfig } from '../types/combat.types';

export const TIMING: TimingConfig = {
  WALK_IN_DELAY: 100,
  FIGHT_START_DELAY: 1800,
  TURN_INTERVAL: 1800,
  ATTACK_DURATION: 350,
  LUNGE_DURATION: 300,
  HIT_DELAY: 200,
  DEATH_DELAY: 1500,
  RESULTS_DELAY: 2000,
};

export const COMBAT: CombatConfig = {
  BASE_HIT_CHANCE: 65,
  HIT_CHANCE_PER_POINT: 4,
  MIN_HIT_CHANCE: 15,
  MAX_HIT_CHANCE: 95,
  CRIT_CHANCE_MULTIPLIER: 1.8,
  CRIT_DAMAGE_MULTIPLIER: 1.6,
  BASE_DAMAGE: 6,
  DEFENSE_REDUCTION: 0.4,
  MIN_DAMAGE: 1,
};

export const MOVEMENT: MovementConfig = {
  LUNGE_DISTANCE: 60,
  DODGE_DISTANCE: 25,
};

export const PARTICLES: ParticlesConfig = {
  COUNT: 6,
  MIN_SIZE: 3,
  MAX_SIZE: 7,
  DURATION: 500,
};

export const CONFIG = {
  TIMING,
  COMBAT,
  MOVEMENT,
  PARTICLES,
};
