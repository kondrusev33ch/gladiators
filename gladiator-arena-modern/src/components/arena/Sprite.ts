/**
 * Sprite - Renders and animates gladiator sprites
 */

import type { WeaponType } from '../../types/gladiator.types';
import { createElement } from '../../utils/dom';

export type SpriteAnimation =
  | 'idle'
  | 'walk'
  | 'advance'
  | 'retreat'
  | 'strafe'
  | 'dash'
  | 'attack'
  | 'block'
  | 'parry'
  | 'stagger'
  | 'hit'
  | 'death'
  | 'victory';

export type AnimationDirection = 'front' | 'oblique' | 'side';

export type ProceduralLayer = 'weapon-trail' | 'head-track' | 'shield-brace';

export interface AnimationOptions {
  direction?: AnimationDirection;
  blend?: boolean;
  rootMotion?: RootMotionCue;
  layers?: ProceduralLayer[];
}

export interface SpriteOptions {
  onRootMotion?: (distance: number, durationMs: number) => void;
}

type AnimationState = 'idle' | 'move' | 'attack' | 'hit' | 'down' | 'victory';

type RootMotionCue = {
  distance: number;
  duration: number;
};

interface ControllerOptions extends SpriteOptions {
  initialDirection: AnimationDirection;
}

const ANIMATION_CLASSNAMES: SpriteAnimation[] = [
  'idle',
  'walk',
  'advance',
  'retreat',
  'strafe',
  'dash',
  'attack',
  'block',
  'parry',
  'stagger',
  'hit',
  'death',
  'victory',
];

const STATE_BY_ANIMATION: Record<SpriteAnimation, AnimationState> = {
  idle: 'idle',
  walk: 'move',
  advance: 'move',
  retreat: 'move',
  strafe: 'move',
  dash: 'move',
  attack: 'attack',
  block: 'hit',
  parry: 'attack',
  stagger: 'hit',
  hit: 'hit',
  death: 'down',
  victory: 'victory',
};

const DIRECTION_CLASSNAMES = ['sprite--dir-front', 'sprite--dir-oblique', 'sprite--dir-side'];
const STATE_CLASSNAMES = [
  'sprite--state-idle',
  'sprite--state-move',
  'sprite--state-attack',
  'sprite--state-hit',
  'sprite--state-down',
  'sprite--state-victory',
];
const LAYER_DURATIONS: Record<ProceduralLayer, number> = {
  'weapon-trail': 280,
  'head-track': 720,
  'shield-brace': 380,
};

class AnimationController {
  private spriteElement: HTMLElement;
  private options: ControllerOptions;
  private currentAnimation: SpriteAnimation = 'idle';
  private currentDirection: AnimationDirection;
  private currentState: AnimationState = 'idle';
  private blendTimeout: number | null = null;
  private layerTimeouts: Map<ProceduralLayer, number> = new Map();

  constructor(spriteElement: HTMLElement, options: ControllerOptions) {
    this.spriteElement = spriteElement;
    this.options = options;
    this.currentDirection = options.initialDirection;
    this.applyDirection(options.initialDirection);
  }

  play(animation: SpriteAnimation, options: AnimationOptions = {}): void {
    if (!this.spriteElement) return;

    const direction = options.direction ?? this.currentDirection;
    this.applyDirection(direction);
    const state = STATE_BY_ANIMATION[animation];
    this.applyState(state, options.blend !== false);
    this.applyClip(animation);
    this.applyProceduralLayers(animation, options.layers);
    if (options.rootMotion && this.options.onRootMotion) {
      this.options.onRootMotion(options.rootMotion.distance, options.rootMotion.duration);
    }

    this.currentAnimation = animation;
  }

  setDirection(direction: AnimationDirection): void {
    this.applyDirection(direction);
  }

  getAnimation(): SpriteAnimation {
    return this.currentAnimation;
  }

  private applyClip(animation: SpriteAnimation): void {
    this.spriteElement.classList.remove(
      ...ANIMATION_CLASSNAMES.map((name) => `sprite--${name}`),
      ...STATE_CLASSNAMES
    );

    // Force reflow to restart animation
    void this.spriteElement.offsetHeight;

    this.spriteElement.classList.add(`sprite--${animation}`, `sprite--state-${STATE_BY_ANIMATION[animation]}`);
  }

  private applyState(state: AnimationState, blend: boolean): void {
    if (this.currentState !== state && blend) {
      this.triggerBlend();
    }
    this.currentState = state;
  }

  private applyDirection(direction: AnimationDirection): void {
    this.currentDirection = direction;
    this.spriteElement.classList.remove(...DIRECTION_CLASSNAMES);
    this.spriteElement.classList.add(`sprite--dir-${direction}`);

    // Tilt the head slightly toward motion for a subtle procedural look
    const lookTilt =
      direction === 'front' ? '6deg' : direction === 'oblique' ? '3deg' : '0deg';
    this.spriteElement.style.setProperty('--look-tilt', lookTilt);
  }

  private triggerBlend(): void {
    if (this.blendTimeout) {
      window.clearTimeout(this.blendTimeout);
    }
    this.spriteElement.classList.add('sprite--blend');
    this.blendTimeout = window.setTimeout(() => {
      this.spriteElement.classList.remove('sprite--blend');
      this.blendTimeout = null;
    }, 320);
  }

  private applyProceduralLayers(
    animation: SpriteAnimation,
    explicitLayers: ProceduralLayer[] | undefined
  ): void {
    const layers = new Set<ProceduralLayer>(explicitLayers ?? []);

    if (animation === 'attack' || animation === 'dash') {
      layers.add('weapon-trail');
    }
    if (animation === 'advance' || animation === 'retreat' || animation === 'strafe') {
      layers.add('head-track');
    }
    if (animation === 'block' || animation === 'parry') {
      layers.add('shield-brace');
    }

    layers.forEach((layer) => this.enableLayer(layer));
  }

  private enableLayer(layer: ProceduralLayer): void {
    const className = `sprite--layer-${layer}`;
    this.spriteElement.classList.add(className);

    const existing = this.layerTimeouts.get(layer);
    if (existing) {
      window.clearTimeout(existing);
    }

    const timeout = window.setTimeout(() => {
      this.spriteElement.classList.remove(className);
      this.layerTimeouts.delete(layer);
    }, LAYER_DURATIONS[layer]);

    this.layerTimeouts.set(layer, timeout);
  }
}

export class Sprite {
  private container: HTMLElement;
  private spriteElement: HTMLElement | null = null;
  private controller: AnimationController | null = null;
  private currentAnimation: SpriteAnimation = 'idle';
  private options: SpriteOptions;

  constructor(container: HTMLElement, options: SpriteOptions = {}) {
    this.container = container;
    this.options = options;
  }

  /**
   * Create sprite HTML structure
   */
  create(weapon: WeaponType, isFlipped: boolean = false): void {
    const weaponClass = `weapon--${weapon}`;
    const flipClass = isFlipped ? 'sprite--flipped' : '';

    this.spriteElement = createElement('div', {
      className: `sprite sprite--idle ${flipClass}`,
      innerHTML: `
        <div class="sprite__part sprite__leg sprite__leg--left"></div>
        <div class="sprite__part sprite__leg sprite__leg--right"></div>
        <div class="sprite__part sprite__torso">
          <div class="sprite__armor"></div>
          <div class="sprite__skirt"></div>
        </div>
        <div class="sprite__part sprite__head">
          <div class="sprite__helmet">
            <div class="sprite__plume"></div>
          </div>
        </div>
        <div class="sprite__part sprite__arm sprite__arm--left">
          <div class="sprite__shield"></div>
        </div>
        <div class="sprite__part sprite__arm sprite__arm--right">
          <div class="sprite__weapon ${weaponClass}"></div>
        </div>
      `,
    });

    this.container.appendChild(this.spriteElement);
    this.controller = new AnimationController(this.spriteElement, {
      ...this.options,
      initialDirection: 'side',
    });
  }

  /**
   * Set animation state
   */
  setAnimation(animation: SpriteAnimation, options: AnimationOptions = {}): void {
    if (!this.spriteElement || !this.controller) return;

    this.controller.play(animation, options);
    this.currentAnimation = animation;
  }

  setDirection(direction: AnimationDirection): void {
    if (!this.spriteElement || !this.controller) return;
    this.controller.setDirection(direction);
  }

  /**
   * Get current animation
   */
  getCurrentAnimation(): SpriteAnimation {
    return this.controller?.getAnimation() ?? this.currentAnimation;
  }

  /**
   * Flip the sprite horizontally
   */
  setFlipped(flipped: boolean): void {
    if (!this.spriteElement) return;

    if (flipped) {
      this.spriteElement.classList.add('sprite--flipped');
    } else {
      this.spriteElement.classList.remove('sprite--flipped');
    }
  }

  /**
   * Destroy sprite
   */
  destroy(): void {
    if (this.spriteElement) {
      this.spriteElement.remove();
      this.spriteElement = null;
    }
  }
}
