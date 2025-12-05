/**
 * Type definitions for combat system
 */

export interface AttackResult {
  hit: boolean;
  damage: number;
  crit: boolean;
}

export interface BattleStats {
  damage: number;
  crits: number;
  dodges: number;
  misses: number;
}

export interface CombatConfig {
  BASE_HIT_CHANCE: number;
  HIT_CHANCE_PER_POINT: number;
  MIN_HIT_CHANCE: number;
  MAX_HIT_CHANCE: number;
  CRIT_CHANCE_MULTIPLIER: number;
  CRIT_DAMAGE_MULTIPLIER: number;
  BASE_DAMAGE: number;
  DEFENSE_REDUCTION: number;
  MIN_DAMAGE: number;
}

export type ActionPhase = 'windup' | 'active' | 'recovery';

export interface AttackTiming {
  windup: number;
  active: number;
  recovery: number;
  range: number;
  staminaCost: number;
  initiativeCost: number;
}

export interface ActionState {
  name: 'attack';
  phase: ActionPhase;
  elapsed: number;
  hasHit: boolean;
  config: AttackTiming;
}

export interface Hitbox {
  owner: 'player' | 'enemy';
  range: number;
  width: number;
  height: number;
  offsetX: number;
  active: boolean;
}

export interface Hurtbox {
  id: 'player' | 'enemy';
  radius: number;
  height: number;
}

export interface RealTimeCombatConfig {
  STEP_MS: number;
  MAX_STEPS_PER_FRAME: number;
  MAX_FRAME_MS: number;
  STAMINA: {
    MAX: number;
    REGEN_PER_SECOND: number;
  };
  INITIATIVE: {
    MAX: number;
    REGEN_PER_SECOND: number;
    ATTACK_THRESHOLD: number;
  };
  ATTACK: AttackTiming;
  HURTBOX: Omit<Hurtbox, 'id'>;
  HITBOX: Pick<Hitbox, 'range' | 'width' | 'height' | 'offsetX'>;
  SPACING: {
    DANGER: number;
    SWEET_MIN: number;
    SWEET_MAX: number;
    UPDATE_INTERVAL: number;
  };
  NAVIGATION: {
    CHECK_INTERVAL: number;
    MAX_STEP: number;
  };
}
