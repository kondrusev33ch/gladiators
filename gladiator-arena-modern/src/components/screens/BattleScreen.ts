/**
 * BattleScreen - Battle interface with arena and combat log
 */

import { Fighter as FighterComponent } from '../arena/Fighter';
import { CombatLog } from '../ui/CombatLog';
import { createElement, $required } from '../../utils/dom';
import { eventBus, EVENTS } from '../../core/EventBus';
import { Effects } from '../../systems/Effects';
import type { Fighter } from '../../types/gladiator.types';

export class BattleScreen {
  private container: HTMLElement;
  private arenaElement: HTMLElement | null = null;
  private vsElement: HTMLElement | null = null;
  private playerFighter: FighterComponent | null = null;
  private enemyFighter: FighterComponent | null = null;
  private combatLog: CombatLog | null = null;
  private effects: Effects | null = null;

  constructor(containerId: string = '#screen-battle') {
    this.container = $required(containerId);
    this.init();
  }

  /**
   * Initialize the battle screen
   */
  private init(): void {
    this.container.innerHTML = '';
    // Don't replace className, just ensure it has the right classes
    this.container.classList.add('screen', 'flex', 'flex-col', 'p-4', 'gap-4');

    // Create arena
    this.arenaElement = this.createArena();

    // Initialize effects system
    if (this.arenaElement) {
      this.effects = new Effects(this.arenaElement);
    }

    // Create combat log container with fixed height
    const logContainer = createElement('div', {
      className: 'combat-log overflow-y-auto p-4 bg-white/20 border-2 border-gold rounded text-sm',
    });
    logContainer.style.height = '300px'; // Fixed height for scrolling

    this.combatLog = new CombatLog(logContainer);

    // Append to container
    this.container.appendChild(this.arenaElement);
    this.container.appendChild(logContainer);

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Create the arena element
   */
  private createArena(): HTMLElement {
    const arena = createElement('div', {
      className: 'arena relative h-[280px] rounded-md overflow-hidden shadow-arena',
      innerHTML: `
        <div class="arena__ground absolute bottom-0 w-full h-[35px] border-t-2 border-black/30"
             style="background: linear-gradient(to bottom, #c4a574 0%, #8b6914 100%);"></div>
      `,
    });

    // Create VS badge
    this.vsElement = createElement('div', {
      className: 'arena__vs absolute top-[15%] left-1/2 -translate-x-1/2 -translate-y-1/2 font-cinzel text-6xl font-bold text-white z-[5] opacity-0 transition-opacity duration-600',
      textContent: 'VS',
      innerHTML: 'VS',
    });
    this.vsElement.style.textShadow = '0 0 30px black, 0 0 60px black';

    arena.appendChild(this.vsElement);

    return arena;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for battle ready event to initialize fighters
    eventBus.on<{ player: Fighter; enemy: Fighter }>(
      EVENTS.BATTLE_READY,
      ({ player, enemy }) => {
        this.initializeFighters(player, enemy);
      }
    );

    // Listen for log messages
    eventBus.on<{ message: string; type?: string }>(
      'combat:log',
      ({ message, type }) => {
        this.combatLog?.log(message, type as any);
      }
    );
  }

  /**
   * Initialize fighters on the arena
   */
  private initializeFighters(player: Fighter, enemy: Fighter): void {
    if (!this.arenaElement) return;

    // Clean up existing fighters
    this.playerFighter?.destroy();
    this.enemyFighter?.destroy();

    // Create player fighter (left side)
    this.playerFighter = new FighterComponent(this.arenaElement, player, true);

    // Create enemy fighter (right side)
    this.enemyFighter = new FighterComponent(
      this.arenaElement,
      enemy,
      false
    );

    // Animate fighters walking in
    this.playerFighter.enter();
    this.enemyFighter.enter();

    // Show VS and transition to idle
    setTimeout(() => {
      this.playerFighter?.idle();
      this.enemyFighter?.idle();
      this.showVS();
    }, 1200);
  }

  /**
   * Show VS badge
   */
  private showVS(): void {
    if (this.vsElement) {
      // Add animation class
      this.vsElement.classList.add('arena__vs--show');
      this.vsElement.style.opacity = '1';

      // Fade out after animation completes
      setTimeout(() => {
        if (this.vsElement) {
          this.vsElement.style.opacity = '0';
          this.vsElement.style.transition = 'opacity 0.5s ease-out';

          // Remove animation class after fade out
          setTimeout(() => {
            this.vsElement?.classList.remove('arena__vs--show');
          }, 500);
        }
      }, 1500);
    }
  }

  /**
   * Get player fighter component
   */
  getPlayerFighter(): FighterComponent | null {
    return this.playerFighter;
  }

  /**
   * Get enemy fighter component
   */
  getEnemyFighter(): FighterComponent | null {
    return this.enemyFighter;
  }

  /**
   * Get combat log
   */
  getCombatLog(): CombatLog | null {
    return this.combatLog;
  }

  /**
   * Get effects system
   */
  getEffects(): Effects | null {
    return this.effects;
  }

  /**
   * Reset the screen
   */
  reset(): void {
    this.playerFighter?.destroy();
    this.enemyFighter?.destroy();
    this.playerFighter = null;
    this.enemyFighter = null;
    this.combatLog?.clear();
    this.effects?.clear();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.reset();
    this.effects?.destroy();
    this.container.innerHTML = '';
  }
}
