/**
 * Gladiator Arena - Main Entry Point
 */

import './style.css';
import { game, eventBus, EVENTS, stateMachine } from '@core/index';
import { GLADIATORS } from '@data/gladiators';
import { TIMING } from '@data/config';
import { randomElement } from './utils/math';
import { wait } from './utils/async';
import type { Fighter as FighterData } from './types/gladiator.types';
import { combatSystem } from './systems/Combat';
import { SelectionScreen, BattleScreen, ResultsScreen } from './components/screens';

/**
 * Screen instances
 */
let battleScreen: BattleScreen;
let resultsScreen: ResultsScreen;

/**
 * Battle state
 */
let battleInterval: number | null = null;
let playerData: FighterData | null = null;
let enemyData: FighterData | null = null;
let turnCount = 0;
let battleStats = {
  player: { damage: 0, crits: 0, dodges: 0, misses: 0 },
  enemy: { damage: 0, crits: 0, dodges: 0, misses: 0 },
};

/**
 * Start the battle
 */
async function startBattle(): Promise<void> {
  const selectedGladiator = game.getState().selectedGladiator;
  if (!selectedGladiator) return;

  // Reset battle screen to clear previous logs and fighters
  battleScreen.reset();

  // Transition to battle screen
  await stateMachine.transitionTo('battle');

  // Reset stats
  turnCount = 0;
  battleStats = {
    player: { damage: 0, crits: 0, dodges: 0, misses: 0 },
    enemy: { damage: 0, crits: 0, dodges: 0, misses: 0 },
  };

  // Create fighter data
  playerData = game.createFighter(selectedGladiator);
  const enemyGladiator = randomElement(GLADIATORS);
  enemyData = game.createFighter(enemyGladiator);
  enemyData.name = `${enemyGladiator.name} (CPU)`;

  // Initialize fighters on battle screen
  eventBus.emit(EVENTS.BATTLE_READY, { player: playerData, enemy: enemyData });

  // Log initial messages
  const log = battleScreen.getCombatLog();
  log?.log('The gates open...', 'system');
  await wait(TIMING.WALK_IN_DELAY + 1100);
  log?.log('The gladiators enter the arena!', 'system');

  // Start fighting
  await wait(TIMING.FIGHT_START_DELAY);
  log?.log('<strong>FIGHT!</strong>', 'system');

  // Start combat loop
  runCombatLoop();
}

/**
 * Run combat loop
 */
function runCombatLoop(): void {
  battleInterval = window.setInterval(() => {
    executeTurn();
  }, TIMING.TURN_INTERVAL);
}

/**
 * Execute a combat turn
 */
function executeTurn(): void {
  const playerFighter = battleScreen.getPlayerFighter();
  const enemyFighter = battleScreen.getEnemyFighter();

  if (!playerFighter || !enemyFighter || !playerData || !enemyData) return;

  turnCount++;

  // Determine initiative
  const playerInit = combatSystem.calculateInitiative(playerData);
  const enemyInit = combatSystem.calculateInitiative(enemyData);

  if (playerInit >= enemyInit) {
    executeAttack(playerFighter, enemyFighter, playerData, enemyData, 'player');
    if (enemyData.currentHp > 0) {
      setTimeout(() => {
        const ef = battleScreen.getEnemyFighter();
        const pf = battleScreen.getPlayerFighter();
        if (ef && pf) executeAttack(ef, pf, enemyData!, playerData!, 'enemy');
      }, TIMING.ATTACK_DURATION + 200);
    }
  } else {
    executeAttack(enemyFighter, playerFighter, enemyData, playerData, 'enemy');
    if (playerData.currentHp > 0) {
      setTimeout(() => {
        const pf = battleScreen.getPlayerFighter();
        const ef = battleScreen.getEnemyFighter();
        if (pf && ef) executeAttack(pf, ef, playerData!, enemyData!, 'player');
      }, TIMING.ATTACK_DURATION + 200);
    }
  }
}

/**
 * Execute an attack
 */
function executeAttack(
  attacker: any,
  defender: any,
  attackerData: FighterData,
  defenderData: FighterData,
  attackerId: 'player' | 'enemy'
): void {
  if (attackerData.currentHp <= 0 || defenderData.currentHp <= 0) return;

  // Perform attack
  const result = combatSystem.performAttack(attackerData, defenderData);

  // Attack animation
  attacker.attack();

  // Process result after hit delay
  setTimeout(() => {
    const log = battleScreen.getCombatLog();

    if (result.hit) {
      // Apply damage
      combatSystem.applyDamage(defenderData, result.damage);

      // Update stats
      battleStats[attackerId].damage += result.damage;
      if (result.crit) battleStats[attackerId].crits++;

      // Visual feedback
      defender.hit();
      defender.showDamage(result.damage, result.crit);
      defender.updateHealth();

      // Log
      const logClass = result.crit ? 'crit' : 'hit';
      const critText = result.crit ? ' <strong>CRITICAL!</strong>' : '';
      log?.log(
        `${attackerData.name} strikes for <span class="combat-log__${logClass}">${result.damage} damage</span>${critText}`,
        'hit'
      );
    } else {
      // Miss
      battleStats[attackerId].misses++;
      const defenderId = attackerId === 'player' ? 'enemy' : 'player';
      battleStats[defenderId].dodges++;

      // Dodge animation
      defender.dodge();
      defender.showText('DODGE');

      log?.log(
        `${attackerData.name} attacks... <span class="combat-log__miss">Miss!</span>`,
        'miss'
      );
    }

    // Check for victory
    checkVictory();
  }, TIMING.HIT_DELAY);
}

/**
 * Check for victory condition
 */
function checkVictory(): void {
  const playerFighter = battleScreen.getPlayerFighter();
  const enemyFighter = battleScreen.getEnemyFighter();
  const log = battleScreen.getCombatLog();

  if (!playerData || !enemyData || !playerFighter || !enemyFighter) return;

  if (playerData.currentHp <= 0 || enemyData.currentHp <= 0) {
    // Stop battle
    if (battleInterval) {
      clearInterval(battleInterval);
      battleInterval = null;
    }

    const playerWon = playerData.currentHp > 0;

    // Death and victory animations
    if (playerWon) {
      enemyFighter.death();
      setTimeout(() => {
        const pf = battleScreen.getPlayerFighter();
        if (pf) pf.victory();
      }, 500);
      log?.log('<strong>VICTORY! The crowd roars!</strong>', 'system');
    } else {
      playerFighter.death();
      setTimeout(() => {
        const ef = battleScreen.getEnemyFighter();
        if (ef) ef.victory();
      }, 500);
      log?.log('<strong>DEFEAT! You have fallen...</strong>', 'system');
    }

    // Show results after delay
    setTimeout(() => showResults(playerWon), TIMING.RESULTS_DELAY);
  }
}

/**
 * Show results screen
 */
async function showResults(playerWon: boolean): Promise<void> {
  await stateMachine.transitionTo('results');

  if (!playerData || !enemyData) return;

  resultsScreen.showResults({
    winner: playerWon ? 'player' : 'enemy',
    turnCount,
    playerStats: battleStats.player,
    enemyStats: battleStats.enemy,
    playerName: playerData.name,
    enemyName: enemyData.name,
  });
}

/**
 * Main initialization
 */
function init(): void {
  console.warn('🏛️ Gladiator Arena - Phase 5: Screens');

  // Initialize game core
  game.init();

  // Initialize screen components
  new SelectionScreen();
  battleScreen = new BattleScreen();
  resultsScreen = new ResultsScreen();

  // Listen for battle start
  eventBus.on(EVENTS.BATTLE_START, async () => {
    await startBattle();
  });

  // Log system status
  console.warn('✅ Phase 5 Systems Active:');
  console.warn('  - EventBus: Ready');
  console.warn('  - StateMachine: Ready');
  console.warn('  - ScreenManager: Ready');
  console.warn('  - Game Controller: Ready');
  console.warn('  - SelectionScreen: Ready');
  console.warn('  - BattleScreen: Ready');
  console.warn('  - ResultsScreen: Ready');
  console.warn(`  - Gladiators: ${GLADIATORS.length} loaded`);
  console.warn('');
  console.warn('🎮 Game ready! Select your gladiator.');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
