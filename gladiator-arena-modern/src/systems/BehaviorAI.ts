import { MOVEMENT, REALTIME } from '@data/config';
import { random } from '@utils/math';
import type {
  AttackPlan,
  BehaviorContext,
  DifficultyId,
  DifficultyProfile,
  EvadeAction,
  FootworkAction,
  ThreatInfo,
} from '../types/ai.types';

export const difficultyProfiles: Record<DifficultyId, DifficultyProfile> = {
  novice: {
    id: 'novice',
    aggression: 0.45,
    mistakeRate: 0.22,
    reactionWindow: [180, 260],
    feintChance: 0.08,
    delayChance: 0.1,
    baitChance: 0.12,
    evadeBias: 0.35,
    parryBias: 0.35,
    spacingDiscipline: 0.45,
    edgeFear: 0.65,
  },
  veteran: {
    id: 'veteran',
    aggression: 0.64,
    mistakeRate: 0.12,
    reactionWindow: [130, 200],
    feintChance: 0.16,
    delayChance: 0.22,
    baitChance: 0.16,
    evadeBias: 0.55,
    parryBias: 0.55,
    spacingDiscipline: 0.68,
    edgeFear: 0.78,
  },
  champion: {
    id: 'champion',
    aggression: 0.78,
    mistakeRate: 0.06,
    reactionWindow: [90, 160],
    feintChance: 0.22,
    delayChance: 0.28,
    baitChance: 0.18,
    evadeBias: 0.68,
    parryBias: 0.72,
    spacingDiscipline: 0.82,
    edgeFear: 0.85,
  },
};

export class BehaviorAI {
  private readonly profile: DifficultyProfile;
  private nextAttackReview = 0;
  private nextFootworkReview = 0;
  private pendingDefenseAt: number | null = null;
  private baitUntil = 0;
  private lastFeintAt = -Infinity;

  constructor(profile: DifficultyProfile) {
    this.profile = profile;
  }

  chooseFootwork(context: BehaviorContext): FootworkAction {
    const now = context.clock;
    if (now < this.nextFootworkReview) return 'hold';

    const staminaRatio = context.fighter.stamina / Math.max(1, context.fighter.maxStamina);
    const spacing = context.spacing;
    const nearEdge = context.edges.nearest < 36;
    const deeplyCornered = context.edges.nearest < 26;
    const wantsRest = staminaRatio < 0.25;
    const exhausted = staminaRatio < 0.32;

    if (exhausted) {
      if (spacing === 'danger-zone') {
        this.nextFootworkReview = now + 140;
        return 'retreat';
      }
      this.nextFootworkReview = now + 220;
      return 'hold';
    }

    const advanceBase =
      (spacing === 'out-of-range' ? 0.75 : 0.25) * (0.7 + this.profile.aggression * 0.6);
    const retreatBase =
      (spacing === 'danger-zone' ? 0.75 : 0.2) *
      (0.35 + (1 - staminaRatio) * 0.7 + (nearEdge ? this.profile.edgeFear : 0));
    const circleBase =
      (spacing === 'sweet-spot' ? 0.25 : 0.1) +
      (nearEdge ? 0.35 : 0.2) +
      this.profile.spacingDiscipline * 0.15;

    const advanceScore = advanceBase - (wantsRest ? 0.3 : 0) - (deeplyCornered ? 0.2 : 0);
    const retreatScore = retreatBase + (wantsRest ? 0.25 : 0);
    const circleScore = circleBase + (deeplyCornered ? 0.2 : 0);
    const holdScore = 0.2 + (this.profile.spacingDiscipline * 0.15 - 0.05);

    const maxScore = Math.max(advanceScore, retreatScore, circleScore, holdScore);
    const decision =
      maxScore === advanceScore
        ? 'advance'
        : maxScore === retreatScore
          ? 'retreat'
          : maxScore === circleScore
            ? 'circle'
            : 'hold';

    this.nextFootworkReview = now + 120;
    return decision;
  }

  chooseAttack(context: BehaviorContext): AttackPlan | null {
    const now = context.clock;
    if (context.fighter.action) return null;
    if (now < this.nextAttackReview || this.baitUntil > now) return null;

    const ready =
      context.fighter.initiative >= context.fighter.initiativeThreshold &&
      context.fighter.stamina >= REALTIME.ATTACK.staminaCost;

    if (!ready) return null;

    const staminaRatio = context.fighter.stamina / Math.max(1, context.fighter.maxStamina);
    const initiativeRatio =
      context.fighter.initiative / Math.max(1, context.fighter.initiativeThreshold);

    const spacingScore =
      context.spacing === 'sweet-spot'
        ? 0.85
        : context.spacing === 'danger-zone'
          ? 0.65
          : context.distance <= context.attackReach + 28
            ? 0.7
            : 0.35;

    let attackUtility =
      this.profile.aggression * 0.65 +
      spacingScore * 0.25 +
      staminaRatio * 0.1 +
      (initiativeRatio > 1 ? 0.1 : 0);

    if (context.opponent.action && context.spacing !== 'out-of-range') {
      attackUtility += 0.08;
    }

    if (context.edges.nearest < 20) {
      attackUtility -= 0.18;
    }

    if (attackUtility < 0.55) {
      if (Math.random() < this.profile.baitChance && context.spacing !== 'out-of-range') {
        this.baitUntil = now + 420;
      }
      this.nextAttackReview = now + 180;
      return null;
    }

    if (Math.random() < this.profile.mistakeRate * 0.65) {
      this.nextAttackReview = now + 160;
      return null;
    }

    const plan = this.pickAttackPlan(context, attackUtility);
    this.nextAttackReview = now + 160 + (1 - this.profile.aggression) * 120;
    return plan;
  }

  chooseDefense(context: BehaviorContext, threat: ThreatInfo): 'block' | 'parry' | null {
    if (!threat.active && !threat.imminent) {
      this.pendingDefenseAt = null;
      return null;
    }

    if (context.fighter.stamina < 4) return null;

    if (this.pendingDefenseAt === null) {
      this.pendingDefenseAt = context.clock + this.rollReactionDelay();
      return null;
    }

    if (context.clock < this.pendingDefenseAt) return null;

    this.pendingDefenseAt = null;

    const pressure = threat.distance < context.attackReach * 0.7 ? 0.08 : 0;
    const blunderChance = this.profile.mistakeRate + pressure * 0.6;
    if (Math.random() < blunderChance) return null;

    const preferParry =
      context.fighter.stamina >= REALTIME.PARRY.staminaCost &&
      Math.random() < this.profile.parryBias;

    return preferParry ? 'parry' : 'block';
  }

  chooseEvade(context: BehaviorContext, threat: ThreatInfo): EvadeAction {
    if (!threat.active && !threat.imminent) return null;
    if (context.fighter.stamina <= 6) return null;

    const dangerWeight =
      threat.distance < context.attackReach * 0.65 ? 1 : threat.imminent ? 0.75 : 0.4;
    const edgeWeight = context.edges.nearest < 32 ? 1.1 : 0.85;
    const chance = this.profile.evadeBias * dangerWeight * edgeWeight;

    if (Math.random() > chance) return null;

    const canDash = context.fighter.stamina >= MOVEMENT.DASH.STAMINA_COST;
    const wantsDash = threat.active && canDash;
    if (wantsDash) return 'dash';

    const canDodge = context.fighter.stamina >= MOVEMENT.DODGE.STAMINA_COST;
    return canDodge ? 'dodge' : null;
  }

  private pickAttackPlan(context: BehaviorContext, utility: number): AttackPlan {
    const now = context.clock;
    const feintAvailable = now - this.lastFeintAt > 650;
    const wantsFeint =
      feintAvailable &&
      Math.random() < this.profile.feintChance &&
      context.spacing !== 'danger-zone';

    if (wantsFeint) {
      this.lastFeintAt = now;
      const feintAt = REALTIME.ATTACK.windup * random(0.55, 0.9);
      return { style: 'feint', feintAt };
    }

    const wantsDelay =
      Math.random() < this.profile.delayChance || (utility > 0.85 && Math.random() > 0.5);
    if (wantsDelay) {
      const windupHold = random(60, 180);
      return { style: 'delayed', windupHold };
    }

    return { style: 'standard' };
  }

  private rollReactionDelay(): number {
    const [min, max] = this.profile.reactionWindow;
    return random(min, max);
  }
}
