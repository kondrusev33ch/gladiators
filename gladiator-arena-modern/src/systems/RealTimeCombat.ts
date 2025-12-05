/**
 * RealTimeCombat - Fixed timestep combat runtime with stamina/initiative and hitboxes
 */

import type { Fighter as FighterData } from '../types/gladiator.types';
import type {
  ActionState,
  AttackTiming,
  Hitbox,
  Hurtbox,
  BattleStats,
} from '../types/combat.types';
import { combatSystem } from './Combat';
import { FixedTimestep } from '../core/FixedTimestep';
import { MOVEMENT, REALTIME, TIMING } from '../data/config';
import { eventBus, EVENTS } from '../core/EventBus';
import { clamp } from '../utils/math';
import type { Fighter as FighterComponent } from '../components/arena/Fighter';
import type { Effects } from './Effects';
import type { SpacingBand, SpacingStatus } from '../types/game.types';

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

    this.emitSpacing();
    this.running = true;
    this.loop.start((step: number) => this.update(step));
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.loop.stop();
    this.runtime = null;
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

    this.advanceAction(player, enemy, stepMs);
    this.advanceAction(enemy, player, stepMs);

    if (this.navAccumulator >= REALTIME.NAVIGATION.CHECK_INTERVAL) {
      this.handleNavigation(player, enemy, this.navAccumulator);
      this.handleNavigation(enemy, player, this.navAccumulator);
      this.navAccumulator = 0;
    }

    if (this.spacingAccumulator >= REALTIME.SPACING.UPDATE_INTERVAL) {
      this.emitSpacing();
      this.spacingAccumulator = 0;
    }

    eventBus.emit(EVENTS.COMBAT_TICK, { dt: stepMs });
  }

  private regenMeters(fighter: RuntimeFighter, stepMs: number): void {
    const staminaGain = (REALTIME.STAMINA.REGEN_PER_SECOND / 1000) * stepMs;
    const initiativeGain = (REALTIME.INITIATIVE.REGEN_PER_SECOND / 1000) * stepMs;

    this.updateStamina(fighter, fighter.data.stamina + staminaGain);
    this.updateInitiative(fighter, fighter.data.initiative + initiativeGain);

    if (!fighter.action) {
      this.tryQueueAttack(fighter);
    }
  }

  private tryQueueAttack(fighter: RuntimeFighter): void {
    if (!this.runtime || !this.context) return;

    const { ATTACK } = REALTIME;

    if (
      fighter.data.initiative < fighter.data.initiativeThreshold ||
      fighter.data.stamina < ATTACK.staminaCost
    ) {
      return;
    }

    this.updateInitiative(fighter, fighter.data.initiative - ATTACK.initiativeCost);
    this.updateStamina(fighter, fighter.data.stamina - ATTACK.staminaCost);

    const action: ActionState = {
      name: 'attack',
      phase: 'windup',
      elapsed: 0,
      hasHit: false,
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

    action.elapsed += stepMs;

    switch (action.phase) {
      case 'windup':
        if (action.elapsed >= action.config.windup) {
          action.phase = 'active';
          attacker.hitbox.active = true;
          this.tryEvade(defender, attacker);
          eventBus.emit(EVENTS.HITBOX_ACTIVE, { owner: attacker.id });
        }
        break;
      case 'active':
        this.checkCollision(attacker, defender, action);
        if (action.elapsed >= action.config.windup + action.config.active) {
          action.phase = 'recovery';
          attacker.hitbox.active = false;
        }
        break;
      case 'recovery':
        if (
          action.elapsed >=
          action.config.windup + action.config.active + action.config.recovery
        ) {
          if (!action.hasHit) {
            this.handleWhiff(attacker, defender);
          }
          attacker.action = null;
          attacker.component.idle();
        }
        break;
    }
  }

  private checkCollision(
    attacker: RuntimeFighter,
    defender: RuntimeFighter,
    action: ActionState
  ): void {
    if (action.hasHit) return;

    const distance = this.getDistance(attacker, defender);
    const reach = this.getAttackReach(action.config);

    if (defender.invulnerableUntil > this.clock) return;

    if (distance > reach) return;

    const result = combatSystem.performAttack(attacker.data, defender.data);
    action.hasHit = true;

    if (result.hit) {
      this.handleHit(attacker, defender, result.damage, result.crit);
    } else {
      this.handleMiss(attacker, defender);
    }
  }

  private getDistance(a: RuntimeFighter, b: RuntimeFighter): number {
    const aPos = a.component.getPosition();
    const bPos = b.component.getPosition();
    return Math.abs(aPos.x - bPos.x);
  }

  private getAttackReach(timing: AttackTiming): number {
    return timing.range + REALTIME.HURTBOX.radius;
  }

  private handleNavigation(
    fighter: RuntimeFighter,
    opponent: RuntimeFighter,
    elapsedMs: number
  ): void {
    if (!this.context || fighter.action || fighter.data.stamina <= 2) return;

    const distance = this.getDistance(fighter, opponent);
    const opponentPos = opponent.component.getPosition().x;
    const dtSeconds = elapsedMs / 1000;

    const forwardStep = Math.min(
      REALTIME.NAVIGATION.MAX_STEP,
      MOVEMENT.FOOTWORK.SPEED * dtSeconds
    );
    const retreatStep = Math.min(
      REALTIME.NAVIGATION.MAX_STEP,
      MOVEMENT.FOOTWORK.BACKPEDAL_SPEED * dtSeconds
    );

    const minimumGap = REALTIME.HURTBOX.radius * 1.6;
    let moved = 0;

    if (distance > REALTIME.SPACING.SWEET_MAX) {
      const cappedStep = Math.max(0, Math.min(forwardStep, distance - minimumGap));
      moved = fighter.component.advanceToward(opponentPos, cappedStep);
    } else if (distance < REALTIME.SPACING.DANGER) {
      moved = fighter.component.retreatFrom(opponentPos, retreatStep);
    } else if (Math.random() < 0.25) {
      const laneDir: -1 | 1 = Math.random() > 0.5 ? 1 : -1;
      const strafed = fighter.component.strafe(laneDir);
      if (strafed) {
        this.spendStamina(fighter, MOVEMENT.FOOTWORK.COST_PER_SECOND * dtSeconds * 0.6);
        return;
      }
    }

    if (moved !== 0) {
      const travelSeconds = Math.max(dtSeconds, Math.abs(moved) / Math.max(1, MOVEMENT.FOOTWORK.SPEED));
      this.spendStamina(fighter, MOVEMENT.FOOTWORK.COST_PER_SECOND * travelSeconds);
    }
  }

  private emitSpacing(): void {
    if (!this.runtime) return;
    const distance = this.getDistance(this.runtime.player, this.runtime.enemy);
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

  private tryEvade(defender: RuntimeFighter, attacker: RuntimeFighter): void {
    if (!this.context || defender.action) return;

    const distance = this.getDistance(attacker, defender);
    const attackerPos = attacker.component.getPosition().x;
    const defenderPos = defender.component.getPosition().x;
    const awayDirection: Direction = defenderPos < attackerPos ? 'left' : 'right';

    if (distance < REALTIME.SPACING.DANGER && defender.data.stamina >= MOVEMENT.DASH.STAMINA_COST) {
      const dashed = this.executeDash(defender, awayDirection);
      if (dashed) return;
    }

    if (defender.data.stamina >= MOVEMENT.DODGE.STAMINA_COST) {
      const odds = distance > REALTIME.SPACING.SWEET_MAX ? 0.4 : 0.65;
      if (Math.random() < odds) {
        this.executeDodge(defender, awayDirection);
      }
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
