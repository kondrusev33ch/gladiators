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
