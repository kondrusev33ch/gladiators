import { realTimeCombat } from './src/systems/RealTimeCombat';
import type { Fighter as FighterData } from './src/types/gladiator.types';
import type { Fighter as FighterComponent } from './src/components/arena/Fighter';

// Polyfill RAF for Node
const rafHandles = new Set<NodeJS.Timeout>();
(globalThis as any).requestAnimationFrame = (cb: (t: number) => void) => {
  const handle = setTimeout(() => cb(performance.now()), 16);
  rafHandles.add(handle);
  return handle as unknown as number;
};
(globalThis as any).cancelAnimationFrame = (handle: number) => {
  const timeout = handle as unknown as NodeJS.Timeout;
  clearTimeout(timeout);
  rafHandles.delete(timeout);
};

class StubFighter implements FighterComponent {
  private x: number;
  constructor(x: number) {
    this.x = x;
  }
  // Position center
  getPosition() {
    return { x: this.x, y: 0 } as { x: number; y: number };
  }
  attack() {}
  idle() {}
  block() {}
  parry() {}
  stagger(direction: 'left' | 'right', distance: number) {
    this.x += direction === 'left' ? -distance : distance;
  }
  hit() {}
  showDamage() {}
  updateHealth() {}
  showText() {}
  death() {}
  victory() {}
  dodge(direction: 'left' | 'right', distance: number) {
    const delta = direction === 'left' ? -distance : distance;
    this.x += delta;
    return delta;
  }
  dash(direction: 'left' | 'right', distance: number) {
    const delta = direction === 'left' ? -distance : distance;
    this.x += delta;
    return delta;
  }
  advanceToward(targetX: number, maxStep: number) {
    const dir = this.x < targetX ? 1 : -1;
    const step = Math.min(maxStep, Math.abs(targetX - this.x));
    const applied = dir * step;
    this.x += applied;
    return applied;
  }
  retreatFrom(targetX: number, maxStep: number) {
    const dir = this.x < targetX ? -1 : 1;
    const step = Math.min(maxStep, Math.abs(targetX - this.x));
    const applied = dir * step;
    this.x += applied;
    return applied;
  }
  strafe() {
    return false;
  }
}

const makeFighter = (name: string, baseX: number): FighterData => ({
  id: name,
  name,
  icon: '',
  weapon: 'sword',
  stats: { str: 7, agi: 6, def: 5, acc: 7, hp: 100 },
  currentHp: 100,
  maxHp: 100,
  stamina: 100,
  maxStamina: 100,
  initiative: 0,
  initiativeThreshold: 60,
});

const player = makeFighter('Player', 0);
const enemy = makeFighter('Enemy', 0);

const playerComponent = new StubFighter(120);
const enemyComponent = new StubFighter(480);

realTimeCombat.start({
  player,
  enemy,
  playerComponent: playerComponent as unknown as FighterComponent,
  enemyComponent: enemyComponent as unknown as FighterComponent,
  stats: {
    player: { damage: 0, crits: 0, dodges: 0, misses: 0 },
    enemy: { damage: 0, crits: 0, dodges: 0, misses: 0 },
  },
  effects: null,
  onBattleEnd: winner => {
    console.log('Battle ended winner', winner);
  },
});

setTimeout(() => {
  realTimeCombat.stop();
  console.log('Positions', playerComponent.getPosition(), enemyComponent.getPosition());
  console.log('Stats', player, enemy);
  process.exit(0);
}, 5000);
