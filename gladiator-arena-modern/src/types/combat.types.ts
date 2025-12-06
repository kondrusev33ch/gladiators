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

export type ActionName = 'attack' | 'block' | 'parry' | 'stagger';

export interface AttackTiming {
  windup: number;
  active: number;
  recovery: number;
  range: number;
  staminaCost: number;
  initiativeCost: number;
  cancel: {
    windup: number;
    recovery: number;
  };
}

export interface AttackBehavior {
  tag: 'standard' | 'feint' | 'delayed';
  windupHold?: number;
  feintAt?: number;
  hasFeinted?: boolean;
}

export interface BlockTiming {
  windup: number;
  active: number;
  recovery: number;
  staminaDrainPerSecond: number;
  chipDamageRatio: number;
  guardBreakThreshold: number;
}

export interface ParryTiming {
  windup: number;
  window: number;
  recovery: number;
  staminaCost: number;
  counterMultiplier: number;
  counterStun: number;
}

export interface StaggerTiming {
  base: number;
  guardBreak: number;
  heavyHit: number;
  threshold: number;
}

export interface BaseActionState<Name extends ActionName = ActionName> {
  name: Name;
  elapsed: number;
}

export interface AttackState extends BaseActionState<'attack'> {
  phase: ActionPhase;
  hasHit: boolean;
  behavior?: AttackBehavior;
  config: AttackTiming;
}

export interface BlockState extends BaseActionState<'block'> {
  phase: Exclude<ActionPhase, 'active'> | 'active';
  blockedDamage: number;
  config: BlockTiming;
}

export interface ParryState extends BaseActionState<'parry'> {
  phase: Exclude<ActionPhase, 'active'> | 'active';
  counterReady: boolean;
  config: ParryTiming;
}

export interface StaggerState extends BaseActionState<'stagger'> {
  phase: 'stunned';
  duration: number;
  reason: 'guard-break' | 'impact' | 'parried';
}

export type ActionState = AttackState | BlockState | ParryState | StaggerState;

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
    RECOVERY_DELAY: number;
    LOW_STAMINA_THRESHOLD: number;
    LOW_STAMINA_BONUS: number;
    ACTION_REGEN_PENALTY: number;
  };
  INITIATIVE: {
    MAX: number;
    REGEN_PER_SECOND: number;
    ATTACK_THRESHOLD: number;
  };
  ATTACK: AttackTiming;
  BLOCK: BlockTiming;
  PARRY: ParryTiming;
  STAGGER: StaggerTiming;
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
