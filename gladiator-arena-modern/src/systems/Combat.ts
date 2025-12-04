/**
 * Combat System - Handles all combat calculations
 */

import type { Fighter } from '../types/gladiator.types';
import type { AttackResult } from '../types/combat.types';
import { COMBAT } from '../data/config';
import { random, clamp } from '../utils/math';

export class CombatSystem {
  /**
   * Calculate hit chance based on attacker accuracy and defender agility
   */
  calculateHitChance(attacker: Fighter, defender: Fighter): number {
    const {
      BASE_HIT_CHANCE,
      HIT_CHANCE_PER_POINT,
      MIN_HIT_CHANCE,
      MAX_HIT_CHANCE,
    } = COMBAT;

    const accuracyBonus = attacker.stats.acc * HIT_CHANCE_PER_POINT;
    const agilityPenalty = defender.stats.agi * HIT_CHANCE_PER_POINT;
    const hitChance = BASE_HIT_CHANCE + accuracyBonus - agilityPenalty;

    return clamp(hitChance, MIN_HIT_CHANCE, MAX_HIT_CHANCE);
  }

  /**
   * Check if attack is a critical hit
   */
  isCritical(attacker: Fighter): boolean {
    const critChance = attacker.stats.agi * COMBAT.CRIT_CHANCE_MULTIPLIER;
    return random(0, 100) < critChance;
  }

  /**
   * Calculate damage dealt
   */
  calculateDamage(
    attacker: Fighter,
    defender: Fighter,
    isCrit: boolean
  ): number {
    const { BASE_DAMAGE, CRIT_DAMAGE_MULTIPLIER, DEFENSE_REDUCTION, MIN_DAMAGE } =
      COMBAT;

    const multiplier = isCrit ? CRIT_DAMAGE_MULTIPLIER : 1;
    const rawDamage = (BASE_DAMAGE + attacker.stats.str) * multiplier;
    const mitigation = defender.stats.def * DEFENSE_REDUCTION;

    return Math.max(MIN_DAMAGE, Math.floor(rawDamage - mitigation));
  }

  /**
   * Calculate initiative (who goes first)
   */
  calculateInitiative(fighter: Fighter): number {
    return fighter.stats.agi + random(0, 10);
  }

  /**
   * Perform a complete attack
   */
  performAttack(attacker: Fighter, defender: Fighter): AttackResult {
    // Calculate hit chance
    const hitChance = this.calculateHitChance(attacker, defender);
    const roll = random(0, 100);

    // Check if attack misses
    if (roll > hitChance) {
      return { hit: false, damage: 0, crit: false };
    }

    // Attack hits - check for critical
    const isCrit = this.isCritical(attacker);
    const damage = this.calculateDamage(attacker, defender, isCrit);

    return { hit: true, damage, crit: isCrit };
  }

  /**
   * Apply damage to a fighter
   */
  applyDamage(fighter: Fighter, damage: number): void {
    fighter.currentHp = Math.max(0, fighter.currentHp - damage);
  }

  /**
   * Check if fighter is defeated
   */
  isDefeated(fighter: Fighter): boolean {
    return fighter.currentHp <= 0;
  }

  /**
   * Get health percentage
   */
  getHealthPercent(fighter: Fighter): number {
    return (fighter.currentHp / fighter.maxHp) * 100;
  }
}

// Create singleton instance
export const combatSystem = new CombatSystem();
