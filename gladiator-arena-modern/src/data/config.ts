/**
 * Game configuration and constants
 */

import type { TimingConfig, MovementConfig, ParticlesConfig, EffectsConfig } from '../types/game.types';
import type { CombatConfig, RealTimeCombatConfig } from '../types/combat.types';

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

export const REALTIME: RealTimeCombatConfig = {
  STEP_MS: 1000 / 60,
  MAX_STEPS_PER_FRAME: 5,
  MAX_FRAME_MS: 48,
  STAMINA: {
    MAX: 90,
    REGEN_PER_SECOND: 14,
    RECOVERY_DELAY: 650,
    LOW_STAMINA_THRESHOLD: 0.45,
    LOW_STAMINA_BONUS: 1.35,
    ACTION_REGEN_PENALTY: 0.55,
  },
  INITIATIVE: {
    MAX: 100,
    REGEN_PER_SECOND: 30,
    ATTACK_THRESHOLD: 60,
  },
  ATTACK: {
    windup: 220,
    active: 140,
    recovery: 420,
    range: 120,
    staminaCost: 26,
    initiativeCost: 60,
    cancel: {
      windup: 140,
      recovery: 180,
    },
  },
  BLOCK: {
    windup: 90,
    active: 520,
    recovery: 260,
    staminaDrainPerSecond: 18,
    chipDamageRatio: 0.28,
    guardBreakThreshold: 42,
  },
  PARRY: {
    windup: 70,
    window: 170,
    recovery: 240,
    staminaCost: 14,
    counterMultiplier: 1.55,
    counterStun: 420,
  },
  STAGGER: {
    base: 240,
    guardBreak: 520,
    heavyHit: 380,
    threshold: 16,
  },
  HURTBOX: {
    radius: 38,
    height: 110,
  },
  HITBOX: {
    range: 120,
    width: 50,
    height: 50,
    offsetX: 24,
  },
  SPACING: {
    DANGER: 90,
    SWEET_MIN: 105,
    SWEET_MAX: 150,
    UPDATE_INTERVAL: 140,
  },
  NAVIGATION: {
    CHECK_INTERVAL: 110,
    MAX_STEP: 26,
  },
};

export const MOVEMENT: MovementConfig = {
  LUNGE_DISTANCE: 60,
  ARENA_PADDING: 60,
  LANES: [-18, 0, 18],
  FOOTWORK: {
    SPEED: 240, // px per second
    BACKPEDAL_SPEED: 280, // px per second
    STRAFE_DISTANCE: 55,
    COST_PER_SECOND: 7,
  },
  DODGE: {
    DISTANCE: 32,
    STAMINA_COST: 14,
    IFRAMES: 260,
  },
  DASH: {
    DISTANCE: 115,
    STAMINA_COST: 22,
    IFRAMES: 320,
  },
};

export const PARTICLES: ParticlesConfig = {
  COUNT: 6,
  MIN_SIZE: 3,
  MAX_SIZE: 7,
  DURATION: 500,
};

export const FX: EffectsConfig = {
  HEAVY_HIT_THRESHOLD: 18,
  CRIT_HITSTOP: { freezeDuration: 140, slowDuration: 520, slowScale: 1.5 },
  PARRY_HITSTOP: { freezeDuration: 110, slowDuration: 380, slowScale: 1.25 },
  CAMERA_SHAKE_INTENSITY: 1.15,
};

export const CONFIG = {
  TIMING,
  COMBAT,
  REALTIME,
  MOVEMENT,
  PARTICLES,
  FX,
};
