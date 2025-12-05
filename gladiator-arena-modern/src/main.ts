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
import { SelectionScreen, BattleScreen, ResultsScreen } from './components/screens';
import { realTimeCombat } from './systems/RealTimeCombat';

/**
 * Screen instances
 */
let selectionScreen: SelectionScreen;
let battleScreen: BattleScreen;
let resultsScreen: ResultsScreen;

/**
 * Battle state
 */
let playerData: FighterData | null = null;
let enemyData: FighterData | null = null;
let turnCount = 0;
let battleStats = {
  player: { damage: 0, crits: 0, dodges: 0, misses: 0 },
  enemy: { damage: 0, crits: 0, dodges: 0, misses: 0 },
};

function resetBattleStats(): void {
  turnCount = 0;
  battleStats = {
    player: { damage: 0, crits: 0, dodges: 0, misses: 0 },
    enemy: { damage: 0, crits: 0, dodges: 0, misses: 0 },
  };
}

/**
 * Start the battle
 */
async function startBattle(): Promise<void> {
  const selectedGladiator = game.getState().selectedGladiator;
  if (!selectedGladiator) return;

  // Reset battle screen to clear previous logs and fighters
  battleScreen.reset();
  realTimeCombat.stop();

  // Transition to battle screen
  await stateMachine.transitionTo('battle');

  // Reset stats
  resetBattleStats();

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
  startCombatRuntime();
}

function startCombatRuntime(): void {
  const playerFighter = battleScreen.getPlayerFighter();
  const enemyFighter = battleScreen.getEnemyFighter();

  if (!playerFighter || !enemyFighter || !playerData || !enemyData) return;

  realTimeCombat.start({
    player: playerData,
    enemy: enemyData,
    playerComponent: playerFighter,
    enemyComponent: enemyFighter,
    stats: battleStats,
    effects: battleScreen.getEffects(),
    onBattleEnd: winner => showResults(winner === 'player'),
  });
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
  console.warn('🏛️ Gladiator Arena - Real-Time Combat Core');

  // Initialize game core
  game.init();

  // Initialize screen components
  selectionScreen = new SelectionScreen();
  battleScreen = new BattleScreen();
  resultsScreen = new ResultsScreen();

  // Listen for battle start
  eventBus.on(EVENTS.BATTLE_START, async () => {
    await startBattle();
  });

  // Count exchanges off the real-time attack start event
  eventBus.on(EVENTS.ATTACK_START, () => {
    turnCount++;
  });

  // Ensure full reset clears UI, state, and any running intervals
  eventBus.on(EVENTS.GAME_RESET, () => {
    realTimeCombat.stop();
    playerData = null;
    enemyData = null;
    resetBattleStats();

    selectionScreen.reset();
    battleScreen.reset();
    resultsScreen.reset();
  });

  // Log system status
  console.warn('✅ Real-Time Core Active:');
  console.warn('  - EventBus: Ready (frame + combat events)');
  console.warn('  - StateMachine: Ready');
  console.warn('  - ScreenManager: Ready');
  console.warn('  - Game Controller: Ready');
  console.warn('  - FixedTimestep: Ready');
  console.warn('  - RealTimeCombat: Ready');
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
