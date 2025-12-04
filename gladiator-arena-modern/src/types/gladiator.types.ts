/**
 * Type definitions for gladiators and their characteristics
 */

export type WeaponType = 'sword' | 'spear' | 'trident';

export interface GladiatorStats {
  str: number;  // Strength - affects damage
  agi: number;  // Agility - affects dodge and crit chance
  def: number;  // Defense - reduces incoming damage
  acc: number;  // Accuracy - affects hit chance
  hp: number;   // Health points - total health
}

export interface Gladiator {
  id: string;
  name: string;
  icon: string;
  weapon: WeaponType;
  stats: GladiatorStats;
  description: string;
}

export interface Fighter extends Gladiator {
  currentHp: number;
  maxHp: number;
}
