/**
 * RealTimeCombat - Fixed timestep combat runtime with stamina/initiative and hitboxes
 */

import type { Fighter as FighterData } from '../types/gladiator.types';
import type {
  ActionState,
  AttackState,
  AttackTiming,
  BlockState,
  Hitbox,
  Hurtbox,
  ParryState,
  BattleStats,
  StaggerState,
} from '../types/combat.types';
import { combatSystem } from './Combat';
import { FixedTimestep } from '../core/FixedTimestep';
import { MOVEMENT, REALTIME, TIMING, FX } from '../data/config';
import { eventBus, EVENTS } from '../core/EventBus';
import { clamp } from '../utils/math';
import type { Fighter as FighterComponent } from '../components/arena/Fighter';
import type { Effects } from './Effects';
import type { SpacingBand, SpacingStatus } from '../types/game.types';
import { BehaviorAI, difficultyProfiles } from './BehaviorAI';
import type { BehaviorContext, FootworkAction } from '../types/ai.types';

type Direction = 'left' | 'right';

type FighterId = 'player' | 'enemy';

interface RuntimeFighter {
  id: FighterId;
  data: FighterData;
  component: FighterComponent;
  action: ActionState | null;
  hitbox: Hitbox;
  hurtbox: Hurtbox;
  invulnerableUntil: number;
  nextEvadeAllowed: number;
  staminaRegenUnlock: number;
}

interface CombatContext {
  player: FighterData;
  enemy: FighterData;
  playerComponent: FighterComponent;
  enemyComponent: FighterComponent;
  stats: {
    player: BattleStats;
    enemy: BattleStats;
  };
  effects: Effects | null;
  onBattleEnd: (winner: FighterId) => void;
}

type StaggerReason = 'guard-break' | 'impact' | 'parried';

const isAttackAction = (action: ActionState | null): action is AttackState =>
  !!action && action.name === 'attack';
const isBlockAction = (action: ActionState | null): action is BlockState =>
  !!action && action.name === 'block';
const isParryAction = (action: ActionState | null): action is ParryState =>
  !!action && action.name === 'parry';

export class RealTimeCombat {
  private loop = new FixedTimestep({
    stepMs: REALTIME.STEP_MS,
    maxSubSteps: REALTIME.MAX_STEPS_PER_FRAME,
    maxFrameMs: REALTIME.MAX_FRAME_MS,
  });

  private context: CombatContext | null = null;
  private runtime: { player: RuntimeFighter; enemy: RuntimeFighter } | null = null;
  private running = false;
  private clock = 0;
  private navAccumulator = 0;
  private spacingAccumulator = 0;
  private brains: Record<FighterId, BehaviorAI> | null = null;
  private aiContexts: Record<FighterId, BehaviorContext> | null = null;

  start(context: CombatContext): void {
    this.stop();
    this.context = context;
    this.clock = 0;
    this.navAccumulator = 0;
    this.spacingAccumulator = 0;

    this.runtime = {
      player: this.createRuntimeFighter('player', context.player, context.playerComponent),
      enemy: this.createRuntimeFighter('enemy', context.enemy, context.enemyComponent),
    };

    this.brains = {
      player: new BehaviorAI(difficultyProfiles.veteran),
      enemy: new BehaviorAI(difficultyProfiles.champion),
    };
    this.aiContexts = null;

    this.emitSpacing();
    this.running = true;
    this.loop.start((step: number) => this.update(step));
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.loop.stop();
    this.runtime = null;
    this.brains = null;
    this.aiContexts = null;
  }

  private createRuntimeFighter(
    id: FighterId,
    data: FighterData,
    component: FighterComponent
  ): RuntimeFighter {
    // Reset meters when a battle starts
    data.stamina = REALTIME.STAMINA.MAX;
    data.initiative = 0;

    return {
      id,
      data,
      component,
      action: null,
      hitbox: {
        owner: id,
        ...REALTIME.HITBOX,
        active: false,
      },
      hurtbox: {
        id,
        ...REALTIME.HURTBOX,
      },
      invulnerableUntil: 0,
      nextEvadeAllowed: 0,
      staminaRegenUnlock: 0,
    };
  }

  private updateStamina(fighter: RuntimeFighter, value: number): void {
    const next = clamp(value, 0, fighter.data.maxStamina);
    if (next === fighter.data.stamina) return;

    fighter.data.stamina = next;
    eventBus.emit(EVENTS.STAMINA_CHANGED, {
      id: fighter.id,
      value: fighter.data.stamina,
      max: fighter.data.maxStamina,
    });
  }

  private spendStamina(fighter: RuntimeFighter, amount: number): void {
    if (amount <= 0) return;
    this.updateStamina(fighter, fighter.data.stamina - amount);
    fighter.staminaRegenUnlock = Math.max(
      fighter.staminaRegenUnlock,
      this.clock + REALTIME.STAMINA.RECOVERY_DELAY
    );
  }

  private updateInitiative(fighter: RuntimeFighter, value: number): void {
    const next = clamp(value, 0, REALTIME.INITIATIVE.MAX);
    if (next === fighter.data.initiative) return;

    fighter.data.initiative = next;
    eventBus.emit(EVENTS.INITIATIVE_CHANGED, {
      id: fighter.id,
      value: fighter.data.initiative,
      max: REALTIME.INITIATIVE.MAX,
    });
  }

  private update(stepMs: number): void {
    if (!this.running || !this.runtime || !this.context) return;

    this.clock += stepMs;
    this.navAccumulator += stepMs;
    this.spacingAccumulator += stepMs;

    const { player, enemy } = this.runtime;

    this.regenMeters(player, stepMs);
    this.regenMeters(enemy, stepMs);

    const contexts: Record<FighterId, BehaviorContext> = {
      player: this.buildAIContext(player, enemy),
      enemy: this.buildAIContext(enemy, player),
    };
    this.aiContexts = contexts;

    this.evaluateDefense(player, enemy, contexts.player);
    this.evaluateDefense(enemy, player, contexts.enemy);

    this.advanceAction(player, enemy, stepMs);
    this.advanceAction(enemy, player, stepMs);

    if (this.navAccumulator >= REALTIME.NAVIGATION.CHECK_INTERVAL) {
      this.handleNavigation(player, enemy, this.navAccumulator, contexts.player);
      this.handleNavigation(enemy, player, this.navAccumulator, contexts.enemy);
      this.navAccumulator = 0;
    }

    if (!player.action) this.tryQueueAttack(player, contexts.player);
    if (!enemy.action) this.tryQueueAttack(enemy, contexts.enemy);

    if (this.spacingAccumulator >= REALTIME.SPACING.UPDATE_INTERVAL) {
      this.emitSpacing();
      this.spacingAccumulator = 0;
    }

    eventBus.emit(EVENTS.COMBAT_TICK, { dt: stepMs });
  }

  private regenMeters(fighter: RuntimeFighter, stepMs: number): void {
    if (this.clock < fighter.staminaRegenUnlock) return;

    const actionPenalty =
      fighter.action && fighter.action.name !== 'stagger'
        ? REALTIME.STAMINA.ACTION_REGEN_PENALTY
        : 1;

    let staminaGain = (REALTIME.STAMINA.REGEN_PER_SECOND / 1000) * stepMs * actionPenalty;
    const staminaRatio = fighter.data.stamina / Math.max(1, fighter.data.maxStamina);
    if (staminaRatio <= REALTIME.STAMINA.LOW_STAMINA_THRESHOLD) {
      staminaGain *= REALTIME.STAMINA.LOW_STAMINA_BONUS;
    }

    const initiativeGain = (REALTIME.INITIATIVE.REGEN_PER_SECOND / 1000) * stepMs;

    this.updateStamina(fighter, fighter.data.stamina + staminaGain);
    this.updateInitiative(fighter, fighter.data.initiative + initiativeGain);
  }

  private tryQueueAttack(fighter: RuntimeFighter, context: BehaviorContext): void {
    if (!this.runtime || !this.context || !this.brains) return;

    const { ATTACK } = REALTIME;
    const brain = this.brains[fighter.id];
    const plan = brain.chooseAttack(context);
    if (!plan) return;

    if (
      fighter.data.initiative < fighter.data.initiativeThreshold ||
      fighter.data.stamina < ATTACK.staminaCost
    ) {
      return;
    }

    const inRange = context.distance <= context.attackReach + 8;
    const closingSoon = context.distance <= REALTIME.SPACING.SWEET_MAX + 30;
    if (!inRange && !closingSoon) return;

    this.updateInitiative(fighter, fighter.data.initiative - ATTACK.initiativeCost);
    this.updateStamina(fighter, fighter.data.stamina - ATTACK.staminaCost);

    const action: AttackState = {
      name: 'attack',
      phase: 'windup',
      elapsed: 0,
      hasHit: false,
      behavior:
        plan.style === 'standard'
          ? { tag: 'standard' }
          : {
              tag: plan.style,
              windupHold: plan.windupHold,
              feintAt: plan.feintAt,
            },
      config: ATTACK,
    };

    fighter.action = action;
    fighter.component.attack();
    eventBus.emit(EVENTS.ATTACK_START, { attacker: fighter.id });
  }

  private advanceAction(
    attacker: RuntimeFighter,
    defender: RuntimeFighter,
    stepMs: number
  ): void {
    const action = attacker.action;
    if (!action) return;

    switch (action.name) {
      case 'attack':
        this.advanceAttack(attacker, defender, action, stepMs);
        break;
      case 'block':
        this.advanceBlock(attacker, action, stepMs);
        break;
      case 'parry':
        this.advanceParry(attacker, action, stepMs);
        break;
      case 'stagger':
        this.advanceStagger(attacker, action, stepMs);
        break;
    }
  }

  private advanceAttack(
    attacker: RuntimeFighter,
    defender: RuntimeFighter,
    action: AttackState,
    stepMs: number
  ): void {
    action.elapsed += stepMs;
    const behavior = action.behavior;
    const windupHold = behavior?.windupHold ?? 0;
    const feintThreshold =
      behavior?.tag === 'feint' ? behavior.feintAt ?? action.config.windup * 0.72 : null;

    switch (action.phase) {
      case 'windup':
        if (behavior?.tag === 'feint' && !behavior.hasFeinted && feintThreshold !== null && action.elapsed >= feintThreshold) {
          behavior.hasFeinted = true;
          action.phase = 'recovery';
          attacker.hitbox.active = false;
          attacker.component.showText('FEINT');
          break;
        }

        if (action.elapsed >= action.config.windup + windupHold) {
          action.phase = 'active';
          attacker.hitbox.active = true;
          this.tryEvade(defender, attacker);
          eventBus.emit(EVENTS.HITBOX_ACTIVE, { owner: attacker.id });
        }
        break;
      case 'active':
        this.checkCollision(attacker, defender, action);
        if (action.elapsed >= action.config.windup + windupHold + action.config.active) {
          action.phase = 'recovery';
          attacker.hitbox.active = false;
        }
        break;
      case 'recovery':
        if (
          action.elapsed >=
          action.config.windup + windupHold + action.config.active + action.config.recovery
        ) {
          if (!action.hasHit && behavior?.tag !== 'feint') {
            this.handleWhiff(attacker, defender);
          }
          attacker.action = null;
          attacker.component.idle();
        }
        break;
    }
  }

  private advanceBlock(
    fighter: RuntimeFighter,
    action: BlockState,
    stepMs: number
  ): void {
    action.elapsed += stepMs;

    if (action.phase === 'windup' && action.elapsed >= action.config.windup) {
      action.phase = 'active';
      fighter.component.block();
    }

    if (action.phase === 'active') {
      const drain = (action.config.staminaDrainPerSecond / 1000) * stepMs;
      this.spendStamina(fighter, drain);

      if (fighter.data.stamina <= 0) {
        this.triggerGuardBreak(fighter, null);
        return;
      }

      if (action.elapsed >= action.config.windup + action.config.active) {
        action.phase = 'recovery';
      }
    }

    if (
      action.phase === 'recovery' &&
      action.elapsed >= action.config.windup + action.config.active + action.config.recovery
    ) {
      fighter.action = null;
      fighter.component.idle();
    }
  }

  private advanceParry(
    fighter: RuntimeFighter,
    action: ParryState,
    stepMs: number
  ): void {
    action.elapsed += stepMs;

    if (action.phase === 'windup' && action.elapsed >= action.config.windup) {
      action.phase = 'active';
      fighter.component.parry();
    }

    if (action.phase === 'active' && action.elapsed >= action.config.windup + action.config.window) {
      action.phase = 'recovery';
    }

    if (
      action.phase === 'recovery' &&
      action.elapsed >= action.config.windup + action.config.window + action.config.recovery
    ) {
      fighter.action = null;
      fighter.component.idle();
    }
  }

  private advanceStagger(fighter: RuntimeFighter, action: StaggerState, stepMs: number): void {
    action.elapsed += stepMs;
    if (action.elapsed >= action.duration) {
      fighter.action = null;
      fighter.component.idle();
    }
  }

  private checkCollision(
    attacker: RuntimeFighter,
    defender: RuntimeFighter,
    action: ActionState
  ): void {
    if (!isAttackAction(action) || action.hasHit) return;

    const distance = this.getDistance(attacker, defender);
    const reach = this.getAttackReach(action.config);

    if (defender.invulnerableUntil > this.clock) return;

    if (distance > reach) return;

    const defense = defender.action;
    if (isParryAction(defense) && defense.phase === 'active') {
      action.hasHit = true;
      this.handleParry(defender, attacker, defense);
      return;
    }

    const result = combatSystem.performAttack(attacker.data, defender.data);
    action.hasHit = true;

    if (!result.hit) {
      this.handleMiss(attacker, defender);
      return;
    }

    if (isBlockAction(defense) && defense.phase === 'active') {
      this.handleBlock(defender, attacker, defense, result.damage, result.crit);
      return;
    }

    this.handleHit(attacker, defender, result.damage, result.crit);
  }

  private getDistance(a: RuntimeFighter, b: RuntimeFighter): number {
    const aPos = a.component.getPosition();
    const bPos = b.component.getPosition();
    return Math.abs(aPos.x - bPos.x);
  }

  private getBaseDistance(a: RuntimeFighter, b: RuntimeFighter): number {
    const aPos = a.component.getCenterX();
    const bPos = b.component.getCenterX();
    return Math.abs(aPos - bPos);
  }

  private getAttackReach(timing: AttackTiming): number {
    return timing.range + REALTIME.HURTBOX.radius;
  }

  private handleNavigation(
    fighter: RuntimeFighter,
    opponent: RuntimeFighter,
    elapsedMs: number,
    context: BehaviorContext
  ): void {
    if (!this.context || fighter.action || fighter.data.stamina <= 2) return;

    const staminaRatio = fighter.data.stamina / Math.max(1, fighter.data.maxStamina);
    const shouldRest =
      staminaRatio < REALTIME.STAMINA.LOW_STAMINA_THRESHOLD * 0.7 &&
      context.distance > REALTIME.SPACING.DANGER + 6 &&
      context.edges.nearest > 18;
    if (shouldRest) return;

    const brain = this.brains?.[fighter.id];
    const decision: FootworkAction = brain?.chooseFootwork(context) ?? 'hold';

    const dtSeconds = elapsedMs / 1000;
    const forwardStep = Math.min(
      REALTIME.NAVIGATION.MAX_STEP,
      MOVEMENT.FOOTWORK.SPEED * dtSeconds
    );
    const retreatStep = Math.min(
      REALTIME.NAVIGATION.MAX_STEP,
      MOVEMENT.FOOTWORK.BACKPEDAL_SPEED * dtSeconds
    );
    const opponentPos = opponent.component.getCenterX();
    const minimumGap = REALTIME.HURTBOX.radius * 1.6;
    let moved = 0;

    const nearWall = context.edges.nearest < 20;
    const forcedRetreat = nearWall && decision === 'advance';

    switch (forcedRetreat ? 'retreat' : decision) {
      case 'advance': {
        const distance = this.getBaseDistance(fighter, opponent);
        const cappedStep = Math.max(0, Math.min(forwardStep, distance - minimumGap));
        moved = fighter.component.advanceToward(opponentPos, cappedStep);
        break;
      }
      case 'retreat': {
        moved = fighter.component.retreatFrom(opponentPos, retreatStep);
        break;
      }
      case 'circle': {
        const laneDir: -1 | 1 =
          context.edges.leftSpace < context.edges.rightSpace ? 1 : -1;
        const strafed = fighter.component.strafe(laneDir);
        if (strafed) {
          this.spendStamina(fighter, MOVEMENT.FOOTWORK.COST_PER_SECOND * dtSeconds * 0.6);
          return;
        }
        break;
      }
      case 'hold':
        if (nearWall) {
          const laneDir: -1 | 1 =
            context.edges.leftSpace < context.edges.rightSpace ? 1 : -1;
          const strafed = fighter.component.strafe(laneDir);
          if (strafed) {
            this.spendStamina(fighter, MOVEMENT.FOOTWORK.COST_PER_SECOND * dtSeconds * 0.4);
          }
        }
        return;
    }

    if (moved !== 0) {
      const travelSeconds = Math.max(dtSeconds, Math.abs(moved) / Math.max(1, MOVEMENT.FOOTWORK.SPEED));
      this.spendStamina(fighter, MOVEMENT.FOOTWORK.COST_PER_SECOND * travelSeconds);
    }
  }

  private emitSpacing(): void {
    if (!this.runtime) return;
    // Spacing UI should reflect stable positions, not transient attack lunges
    const distance = this.getBaseDistance(this.runtime.player, this.runtime.enemy);
    const spacing: SpacingStatus = {
      distance,
      player: this.getSpacingBand(distance),
      enemy: this.getSpacingBand(distance),
    };
    eventBus.emit(EVENTS.SPACING_UPDATE, spacing);
  }

  private getSpacingBand(distance: number): SpacingBand {
    if (distance < REALTIME.SPACING.DANGER) return 'danger-zone';
    if (distance >= REALTIME.SPACING.SWEET_MIN && distance <= REALTIME.SPACING.SWEET_MAX) {
      return 'sweet-spot';
    }
    return 'out-of-range';
  }

  private buildAIContext(
    fighter: RuntimeFighter,
    opponent: RuntimeFighter
  ): BehaviorContext {
    const distance = this.getBaseDistance(fighter, opponent);
    const spacing = this.getSpacingBand(distance);
    const bounds = fighter.component.getArenaBounds();
    const centerX = fighter.component.getCenterX();

    return {
      clock: this.clock,
      distance,
      spacing,
      fighter: {
        stamina: fighter.data.stamina,
        maxStamina: fighter.data.maxStamina,
        initiative: fighter.data.initiative,
        initiativeThreshold: fighter.data.initiativeThreshold,
        action: fighter.action,
        centerX,
      },
      opponent: {
        stamina: opponent.data.stamina,
        action: opponent.action,
        centerX: opponent.component.getCenterX(),
      },
      edges: {
        leftSpace: centerX - bounds.left,
        rightSpace: bounds.right - centerX,
        nearest: Math.min(centerX - bounds.left, bounds.right - centerX),
      },
      attackReach: this.getAttackReach(REALTIME.ATTACK),
    };
  }

  private canDefensivelyCancel(action: ActionState | null): boolean {
    if (!isAttackAction(action)) return false;

    if (action.phase === 'windup' && action.elapsed <= action.config.cancel.windup) {
      return true;
    }

    if (
      action.phase === 'recovery' &&
      action.elapsed >= action.config.recovery - action.config.cancel.recovery
    ) {
      return true;
    }

    return false;
  }

  private evaluateDefense(
    defender: RuntimeFighter,
    attacker: RuntimeFighter,
    context: BehaviorContext
  ): void {
    if (!isAttackAction(attacker.action) || !this.brains) return;

    const brain = this.brains[defender.id];
    const action = attacker.action;
    const distance = this.getDistance(attacker, defender);
    const reach = this.getAttackReach(action.config) + 12;

    const threatActive = action.phase === 'active';
    const threatImminent =
      action.phase === 'windup' && action.elapsed >= action.config.windup * 0.55;
    if (!(threatActive || threatImminent) || distance > reach || defender.data.stamina <= 4) return;

    const decision = brain.chooseDefense(context, {
      active: threatActive,
      imminent: threatImminent,
      distance,
    });

    if (!decision) return;

    if (defender.action) {
      if (this.canDefensivelyCancel(defender.action)) {
        defender.hitbox.active = false;
        defender.action = null;
        defender.component.idle();
      } else {
        return;
      }
    }

    if (decision === 'parry') {
      this.startParry(defender);
    } else {
      this.startBlock(defender);
    }
  }

  private startBlock(fighter: RuntimeFighter): void {
    const config = REALTIME.BLOCK;
    fighter.hitbox.active = false;
    fighter.action = {
      name: 'block',
      phase: 'windup',
      elapsed: 0,
      blockedDamage: 0,
      config,
    };
    fighter.component.block();
    fighter.component.showText('BLOCK');
  }

  private startParry(fighter: RuntimeFighter): void {
    const config = REALTIME.PARRY;
    if (fighter.data.stamina < config.staminaCost) return;

    this.spendStamina(fighter, config.staminaCost);
    fighter.hitbox.active = false;
    fighter.action = {
      name: 'parry',
      phase: 'windup',
      elapsed: 0,
      counterReady: false,
      config,
    };
    fighter.component.parry();
    fighter.component.showText('PARRY');
  }

  private startStagger(
    fighter: RuntimeFighter,
    attacker: RuntimeFighter | null,
    duration: number,
    reason: StaggerReason,
    force: number = 0
  ): void {
    fighter.hitbox.active = false;
    fighter.action = {
      name: 'stagger',
      phase: 'stunned',
      elapsed: 0,
      duration,
      reason,
    };

    const direction: Direction = attacker
      ? fighter.component.getPosition().x < attacker.component.getPosition().x
        ? 'left'
        : 'right'
      : Math.random() > 0.5
        ? 'left'
        : 'right';

    const knockback = Math.min(
      MOVEMENT.FOOTWORK.BACKPEDAL_SPEED * 0.45,
      REALTIME.NAVIGATION.MAX_STEP * 2 + force * 0.35
    );
    fighter.component.stagger(direction, knockback);
  }

  private triggerGuardBreak(target: RuntimeFighter, attacker: RuntimeFighter | null): void {
    this.startStagger(target, attacker, REALTIME.STAGGER.guardBreak, 'guard-break');
    target.component.showText('GUARD BREAK');
    eventBus.emit('combat:log', {
      message: `${target.data.name}'s guard shatters!`,
      type: 'system',
    });
  }

  private tryEvade(defender: RuntimeFighter, attacker: RuntimeFighter): void {
    if (!this.context || defender.action || !this.brains) return;
    if (this.clock < defender.nextEvadeAllowed) return;

    const aiContext = this.aiContexts?.[defender.id];
    const distance = this.getDistance(attacker, defender);
    const threat = { active: true, imminent: false, distance };
    const brain = this.brains[defender.id];

    const decision = brain.chooseEvade(
      aiContext ??
        this.buildAIContext(defender, attacker),
      threat
    );

    if (!decision) return;

    const attackerPos = attacker.component.getPosition().x;
    const defenderPos = defender.component.getPosition().x;
    const bounds = defender.component.getArenaBounds();
    const spaceLeft = defenderPos - bounds.left;
    const spaceRight = bounds.right - defenderPos;

    let awayDirection: Direction = defenderPos < attackerPos ? 'left' : 'right';
    if (awayDirection === 'left' && spaceLeft < MOVEMENT.DODGE.DISTANCE * 0.75 && spaceRight > spaceLeft) {
      awayDirection = 'right';
    } else if (awayDirection === 'right' && spaceRight < MOVEMENT.DODGE.DISTANCE * 0.75 && spaceLeft > spaceRight) {
      awayDirection = 'left';
    }

    if (decision === 'dash') {
      const dashed = this.executeDash(defender, awayDirection);
      if (dashed) {
        defender.nextEvadeAllowed = this.clock + 700;
      }
      return;
    }

    const dodged = this.executeDodge(defender, awayDirection);
    if (dodged) {
      defender.nextEvadeAllowed = this.clock + 620;
    }
  }

  private executeDodge(fighter: RuntimeFighter, direction: Direction): boolean {
    const moved = fighter.component.dodge(direction, MOVEMENT.DODGE.DISTANCE);
    if (moved === 0) return false;

    this.spendStamina(fighter, MOVEMENT.DODGE.STAMINA_COST);
    fighter.invulnerableUntil = this.clock + MOVEMENT.DODGE.IFRAMES;
    fighter.component.showText('DODGE');
    if (this.context) {
      this.context.stats[fighter.id].dodges += 1;
    }
    return true;
  }

  private executeDash(fighter: RuntimeFighter, direction: Direction): boolean {
    const moved = fighter.component.dash(direction, MOVEMENT.DASH.DISTANCE);
    if (moved === 0) return false;

    this.spendStamina(fighter, MOVEMENT.DASH.STAMINA_COST);
    fighter.invulnerableUntil = this.clock + MOVEMENT.DASH.IFRAMES;
    fighter.component.showText('DASH');
    if (this.context) {
      this.context.stats[fighter.id].dodges += 1;
    }
    return true;
  }

  private handleBlock(
    defender: RuntimeFighter,
    attacker: RuntimeFighter,
    action: BlockState,
    incomingDamage: number,
    crit: boolean
  ): void {
    if (!this.context) return;

    const chip = Math.max(1, Math.floor(incomingDamage * action.config.chipDamageRatio));
    combatSystem.applyDamage(defender.data, chip);
    this.context.stats[attacker.id].damage += chip;

    action.blockedDamage += incomingDamage;
    this.spendStamina(defender, incomingDamage * 0.3);

    const defenderComponent = defender.component;
    defenderComponent.block();
    defenderComponent.showDamage(chip, false);
    defenderComponent.updateHealth();

    eventBus.emit(EVENTS.HURTBOX_HIT, { target: defender.id, remainingHp: defender.data.currentHp });
    eventBus.emit('combat:log', {
      message: `${defender.data.name} blocks the strike${crit ? ' but the blow is heavy!' : ''}`,
      type: crit ? 'hit' : 'system',
    });

    const guardBroken =
      action.blockedDamage >= action.config.guardBreakThreshold || defender.data.stamina <= 1;

    if (guardBroken) {
      this.triggerGuardBreak(defender, attacker);
    }

    this.checkDefeat();
  }

  private handleParry(defender: RuntimeFighter, attacker: RuntimeFighter, action: ParryState): void {
    if (!this.context) return;
    const effects = this.context.effects;

    action.counterReady = true;
    action.phase = 'recovery';
    this.context.stats[attacker.id].misses += 1;
    this.context.stats[defender.id].dodges += 1;

    effects?.hitStop(FX.PARRY_HITSTOP);
    effects?.cameraShake(FX.CAMERA_SHAKE_INTENSITY * 0.85);

    const counterBase = combatSystem.calculateDamage(defender.data, attacker.data, false);
    const counterDamage = Math.round(counterBase * action.config.counterMultiplier);
    this.startStagger(attacker, defender, action.config.counterStun, 'parried');
    this.handleCounter(defender, attacker, counterDamage);

    eventBus.emit('combat:log', {
      message: `${defender.data.name} parries and counters for <span class="combat-log__hit">${counterDamage} damage</span>!`,
      type: 'hit',
    });
  }

  private handleCounter(
    attacker: RuntimeFighter,
    defender: RuntimeFighter,
    damage: number
  ): void {
    if (!this.context) return;

    combatSystem.applyDamage(defender.data, damage);
    const stats = this.context.stats[attacker.id];
    stats.damage += damage;

    const defenderComponent = defender.component;
    defenderComponent.hit();
    defenderComponent.showDamage(damage, true);
    defenderComponent.updateHealth();

    const effects = this.context.effects;
    const pos = defenderComponent.getPosition();
    effects?.impact(pos.x, pos.y, 12);
    effects?.cameraShake(FX.CAMERA_SHAKE_INTENSITY);

    eventBus.emit(EVENTS.ATTACK_HIT, {
      attacker: attacker.id,
      defender: defender.id,
      damage,
      crit: false,
    });
    eventBus.emit(EVENTS.HURTBOX_HIT, { target: defender.id, remainingHp: defender.data.currentHp });

    this.applyImpactStagger(attacker, defender, damage, true);
    this.checkDefeat();
  }

  private applyImpactStagger(
    attacker: RuntimeFighter,
    defender: RuntimeFighter,
    damage: number,
    crit: boolean
  ): void {
    if (!this.runtime || defender.data.currentHp <= 0) return;

    const force = damage + (crit ? 8 : 0);
    if (force < REALTIME.STAGGER.threshold) return;

    const duration =
      force >= REALTIME.STAGGER.threshold + 8 || crit
        ? REALTIME.STAGGER.heavyHit
        : REALTIME.STAGGER.base;
    this.startStagger(defender, attacker, duration, 'impact', force);
  }

  private handleHit(
    attacker: RuntimeFighter,
    defender: RuntimeFighter,
    damage: number,
    crit: boolean
  ): void {
    if (!this.context || !this.runtime) return;

    combatSystem.applyDamage(defender.data, damage);
    const stats = this.context.stats[attacker.id];
    stats.damage += damage;
    if (crit) stats.crits += 1;

    const defenderComponent = defender.component;
    defenderComponent.hit();
    defenderComponent.showDamage(damage, crit);
    defenderComponent.updateHealth();

    const effects = this.context.effects;
    const pos = defenderComponent.getPosition();
    effects?.blood(pos.x, pos.y, crit ? 12 : 8);
    const heavyHit = damage >= FX.HEAVY_HIT_THRESHOLD;
    if (crit || heavyHit) {
      effects?.cameraShake(crit ? FX.CAMERA_SHAKE_INTENSITY : FX.CAMERA_SHAKE_INTENSITY * 0.85);
    }

    const logClass = crit ? 'crit' : 'hit';
    const critText = crit ? ' <strong>CRITICAL!</strong>' : '';
    eventBus.emit('combat:log', {
      message: `${attacker.data.name} strikes for <span class="combat-log__${logClass}">${damage} damage</span>${critText}`,
      type: 'hit',
    });

    eventBus.emit(EVENTS.ATTACK_HIT, {
      attacker: attacker.id,
      defender: defender.id,
      damage,
      crit,
    });
    eventBus.emit(EVENTS.HURTBOX_HIT, { target: defender.id, remainingHp: defender.data.currentHp });

    if (crit) {
      effects?.hitStop(FX.CRIT_HITSTOP);
    }

    this.applyImpactStagger(attacker, defender, damage, crit);
    this.checkDefeat();
  }

  private handleMiss(attacker: RuntimeFighter, defender: RuntimeFighter): void {
    if (!this.context) return;
    const stats = this.context.stats[attacker.id];
    stats.misses += 1;

    const defenderStats = this.context.stats[defender.id];
    defenderStats.dodges += 1;

    const attackerPos = attacker.component.getPosition().x;
    const defenderPos = defender.component.getPosition().x;
    const direction: Direction = defenderPos < attackerPos ? 'left' : 'right';

    defender.component.dodge(direction, MOVEMENT.DODGE.DISTANCE * 0.6);
    defender.component.showText('DODGE');

    eventBus.emit('combat:log', {
      message: `${attacker.data.name} attacks... <span class="combat-log__miss">Miss!</span>`,
      type: 'miss',
    });

    eventBus.emit(EVENTS.ATTACK_MISS, { attacker: attacker.id, defender: defender.id });
  }

  private handleWhiff(attacker: RuntimeFighter, defender: RuntimeFighter): void {
    // Whiffed because no collision during active frames
    this.handleMiss(attacker, defender);
  }

  private checkDefeat(): void {
    if (!this.context || !this.runtime) return;

    const { player, enemy } = this.runtime;
    const playerDefeated = combatSystem.isDefeated(player.data);
    const enemyDefeated = combatSystem.isDefeated(enemy.data);

    if (!playerDefeated && !enemyDefeated) return;

    this.stop();

    const winner: FighterId = playerDefeated ? 'enemy' : 'player';
    const effects = this.context.effects;

    if (winner === 'player') {
      enemy.component.death();
      setTimeout(() => {
        const pos = player.component.getPosition();
        player.component.victory();
        effects?.sparkle(pos.x, pos.y, 15);
      }, 500);
    } else {
      player.component.death();
      setTimeout(() => {
        const pos = enemy.component.getPosition();
        enemy.component.victory();
        effects?.sparkle(pos.x, pos.y, 15);
      }, 500);
    }

    eventBus.emit(EVENTS.BATTLE_END, { winner });
    setTimeout(() => this.context?.onBattleEnd(winner), TIMING.RESULTS_DELAY);
  }
}

export const realTimeCombat = new RealTimeCombat();
