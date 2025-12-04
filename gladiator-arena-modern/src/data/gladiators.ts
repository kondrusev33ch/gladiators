/**
 * Gladiator definitions and data
 */

import type { Gladiator } from '../types/gladiator.types';

export const GLADIATORS: Gladiator[] = [
  {
    id: 'retiarius',
    name: 'Retiarius',
    icon: '🔱',
    weapon: 'trident',
    stats: { str: 6, agi: 9, def: 3, acc: 8, hp: 85 },
    description: 'Net & Trident fighter. Swift and evasive.',
  },
  {
    id: 'secutor',
    name: 'Secutor',
    icon: '🛡️',
    weapon: 'sword',
    stats: { str: 7, agi: 5, def: 8, acc: 7, hp: 110 },
    description: 'The Pursuer. Heavy armor, relentless.',
  },
  {
    id: 'murmillo',
    name: 'Murmillo',
    icon: '🐟',
    weapon: 'sword',
    stats: { str: 8, agi: 4, def: 9, acc: 6, hp: 125 },
    description: 'The Fish. Maximum defense and health.',
  },
  {
    id: 'dimachaerus',
    name: 'Dimachaerus',
    icon: '⚔️',
    weapon: 'sword',
    stats: { str: 10, agi: 7, def: 3, acc: 7, hp: 90 },
    description: 'Dual-wielder. Devastating damage output.',
  },
  {
    id: 'thraex',
    name: 'Thraex',
    icon: '🗡️',
    weapon: 'sword',
    stats: { str: 7, agi: 7, def: 6, acc: 7, hp: 100 },
    description: 'Thracian. Well-balanced warrior.',
  },
  {
    id: 'hoplomachus',
    name: 'Hoplomachus',
    icon: '🏛️',
    weapon: 'spear',
    stats: { str: 7, agi: 5, def: 7, acc: 9, hp: 105 },
    description: 'Greek style. Precise spear strikes.',
  },
  {
    id: 'velites',
    name: 'Velites',
    icon: '🎯',
    weapon: 'spear',
    stats: { str: 5, agi: 8, def: 3, acc: 10, hp: 85 },
    description: 'Skirmisher. Rarely misses a strike.',
  },
  {
    id: 'provocator',
    name: 'Provocator',
    icon: '⚡',
    weapon: 'sword',
    stats: { str: 8, agi: 6, def: 6, acc: 8, hp: 100 },
    description: 'The Challenger. Aggressive and skilled.',
  },
];
