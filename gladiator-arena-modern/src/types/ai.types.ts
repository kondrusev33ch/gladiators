import type { ActionState } from './combat.types';
import type { SpacingBand } from './game.types';

export type DifficultyId = 'novice' | 'veteran' | 'champion';

export interface DifficultyProfile {
  id: DifficultyId;
  aggression: number;
  mistakeRate: number;
  reactionWindow: [number, number];
  feintChance: number;
  delayChance: number;
  baitChance: number;
  evadeBias: number;
  parryBias: number;
  spacingDiscipline: number;
  edgeFear: number;
}

export interface BehaviorContext {
  clock: number;
  distance: number;
  spacing: SpacingBand;
  fighter: {
    stamina: number;
    maxStamina: number;
    initiative: number;
    initiativeThreshold: number;
    action: ActionState | null;
    centerX: number;
  };
  opponent: {
    stamina: number;
    action: ActionState | null;
    centerX: number;
  };
  edges: {
    leftSpace: number;
    rightSpace: number;
    nearest: number;
  };
  attackReach: number;
}

export interface ThreatInfo {
  active: boolean;
  imminent: boolean;
  distance: number;
}

export interface AttackPlan {
  style: 'standard' | 'feint' | 'delayed';
  windupHold?: number;
  feintAt?: number;
}

export type FootworkAction = 'advance' | 'retreat' | 'circle' | 'hold';

export type EvadeAction = 'dash' | 'dodge' | null;
