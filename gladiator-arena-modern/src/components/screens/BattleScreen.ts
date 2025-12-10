/**
 * BattleScreen - Battle interface with arena and combat log
 */

import { Fighter as FighterComponent } from '../arena/Fighter';
import { CombatLog } from '../ui/CombatLog';
import { createElement, $required } from '../../utils/dom';
import { eventBus, EVENTS } from '../../core/EventBus';
import { Effects } from '../../systems/Effects';
import type { Fighter } from '../../types/gladiator.types';
import type { LogType } from '../../types/game.types';
import { CanvasArena } from '../../systems/rendering/CanvasArena';
import { CameraDirector } from '../../systems/CameraDirector';
import type { CameraTarget } from '../../types/camera.types';

export class BattleScreen {
  private container: HTMLElement;
  private arenaElement: HTMLElement | null = null;
  private shakeLayer: HTMLElement | null = null;
  private stageElement: HTMLElement | null = null;
  private vsElement: HTMLElement | null = null;
  private playerFighter: FighterComponent | null = null;
  private enemyFighter: FighterComponent | null = null;
  private combatLog: CombatLog | null = null;
  private effects: Effects | null = null;
  private renderer: CanvasArena | null = null;
  private camera: CameraDirector | null = null;

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

    // Initialize layered canvas renderer
    if (this.stageElement) {
      this.renderer = new CanvasArena(this.stageElement);
      this.renderer.setRenderBodies(false); // keep DOM sprites visible
      this.renderer.start();
    }

    // Initialize effects system
    if (this.stageElement) {
      this.effects = new Effects(this.stageElement, this.renderer ?? undefined, {
        shakeTarget: this.arenaElement ?? undefined,
      });
    }

    if (this.stageElement) {
      this.camera = new CameraDirector(this.stageElement);
    }

    // Create combat log container with fixed height
    const logContainer = createElement('div', {
      className: 'combat-log overflow-y-auto p-4 bg-white/20 border-2 border-gold rounded text-sm',
    });

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
      className: 'arena relative h-[280px]',
    });

    this.shakeLayer = createElement('div', {
      className: 'arena__shake-layer absolute inset-0',
    });

    this.stageElement = createElement('div', {
      className: 'arena__viewport absolute inset-0',
    });

    const ground = createElement('div', {
      className: 'arena__ground absolute bottom-0 w-full h-[35px] border-t-2 border-black/30',
    });
    ground.style.background = 'linear-gradient(to bottom, #c4a574 0%, #8b6914 100%)';
    ground.style.opacity = '0';
    ground.style.pointerEvents = 'none';

    // Create VS badge
    this.vsElement = createElement('div', {
      className: 'arena__vs absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-cinzel text-6xl font-bold text-white z-[5] opacity-0 transition-opacity duration-600',
      textContent: 'VS',
      innerHTML: 'VS',
    });
    this.vsElement.style.textShadow = '0 0 30px black, 0 0 60px black';

    this.stageElement.appendChild(ground);
    this.stageElement.appendChild(this.vsElement);
    this.shakeLayer.appendChild(this.stageElement);
    arena.appendChild(this.shakeLayer);

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
    eventBus.on<{ message: string; type?: LogType }>(
      'combat:log',
      ({ message, type }) => {
        this.combatLog?.log(message, (type ?? 'system') as LogType);
      }
    );
  }

  /**
   * Initialize fighters on the arena
   */
  private initializeFighters(player: Fighter, enemy: Fighter): void {
    if (!this.stageElement) return;

    // Clean up existing fighters
    this.playerFighter?.destroy();
    this.enemyFighter?.destroy();

    // Create player fighter (left side)
    this.playerFighter = new FighterComponent(
      this.stageElement,
      player,
      true,
      this.renderer ?? undefined
    );

    // Create enemy fighter (right side)
    this.enemyFighter = new FighterComponent(
      this.stageElement,
      enemy,
      false,
      this.renderer ?? undefined
    );

    this.camera?.start(() => this.collectCameraTargets());

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
    this.camera?.stop();
    this.combatLog?.clear();
    this.effects?.clear();
    this.renderer?.removeFighter('player');
    this.renderer?.removeFighter('enemy');
    this.renderer?.clearParticles();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.reset();
    this.camera?.stop();
    this.effects?.destroy();
    this.renderer?.destroy();
    this.container.innerHTML = '';
  }

  private collectCameraTargets(): CameraTarget[] {
    const targets: CameraTarget[] = [];
    if (this.playerFighter) targets.push(this.playerFighter.getCameraTarget());
    if (this.enemyFighter) targets.push(this.enemyFighter.getCameraTarget());
    return targets;
  }
}
