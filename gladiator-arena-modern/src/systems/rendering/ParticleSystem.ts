/**
 * ParticleSystem - CPU light particle simulation targeting the effects layer.
 */

import type { SpriteBatch } from './SpriteBatch';

export type ParticleKind = 'dust' | 'blood' | 'spark';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  drag: number;
  kind: ParticleKind;
}

type ViewportProvider = () => { width: number; height: number };

export class ParticleSystem {
  private readonly particles: Particle[] = [];
  private readonly getViewport: ViewportProvider;
  private readonly cullPadding: number;

  constructor(viewportProvider: ViewportProvider, cullPadding: number) {
    this.getViewport = viewportProvider;
    this.cullPadding = cullPadding;
  }

  clear(): void {
    this.particles.length = 0;
  }

  spawn(kind: ParticleKind, x: number, y: number, count: number = 8): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = this.randomSpeed(kind);
      const size = this.randomSize(kind);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + this.initialLift(kind),
        life: this.maxLife(kind),
        maxLife: this.maxLife(kind),
        size,
        color: this.color(kind),
        gravity: this.gravity(kind),
        drag: this.drag(kind),
        kind,
      });
    }
  }

  update(deltaMs: number): void {
    if (this.particles.length === 0) return;
    const dt = deltaMs / 1000;
    const view = this.getViewport();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.gravity * dt;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= deltaMs;

      if (!this.inView(p, view) || p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(batch: SpriteBatch): void {
    if (this.particles.length === 0) return;
    for (const p of this.particles) {
      const opacity = Math.max(0, p.life / p.maxLife);
      batch.add({
        type: 'ellipse',
        x: p.x,
        y: p.y,
        rx: p.size,
        ry: p.size * 0.6,
        fill: p.color,
        opacity,
      });
    }
  }

  private inView(p: Particle, view: { width: number; height: number }): boolean {
    return (
      p.x >= -this.cullPadding &&
      p.x <= view.width + this.cullPadding &&
      p.y >= -this.cullPadding &&
      p.y <= view.height + this.cullPadding
    );
  }

  private randomSpeed(kind: ParticleKind): number {
    switch (kind) {
      case 'dust':
        return 18 + Math.random() * 12;
      case 'blood':
        return 28 + Math.random() * 18;
      case 'spark':
        return 38 + Math.random() * 14;
      default:
        return 20;
    }
  }

  private randomSize(kind: ParticleKind): number {
    switch (kind) {
      case 'dust':
        return 2 + Math.random() * 2.5;
      case 'blood':
        return 2.5 + Math.random() * 3;
      case 'spark':
        return 1.5 + Math.random() * 2;
      default:
        return 2;
    }
  }

  private color(kind: ParticleKind): string {
    switch (kind) {
      case 'dust':
        return 'rgba(201,162,39,0.75)';
      case 'blood':
        return 'rgba(139,26,26,0.9)';
      case 'spark':
        return 'rgba(255,235,140,0.95)';
      default:
        return 'rgba(255,255,255,0.8)';
    }
  }

  private gravity(kind: ParticleKind): number {
    switch (kind) {
      case 'dust':
        return 18;
      case 'blood':
        return 48;
      case 'spark':
        return 26;
      default:
        return 20;
    }
  }

  private drag(kind: ParticleKind): number {
    switch (kind) {
      case 'dust':
        return 0.94;
      case 'blood':
        return 0.92;
      case 'spark':
        return 0.9;
      default:
        return 0.95;
    }
  }

  private initialLift(kind: ParticleKind): number {
    switch (kind) {
      case 'dust':
        return -24;
      case 'blood':
        return -18;
      case 'spark':
        return -32;
      default:
        return -10;
    }
  }

  private maxLife(kind: ParticleKind): number {
    switch (kind) {
      case 'dust':
        return 550;
      case 'blood':
        return 750;
      case 'spark':
        return 520;
      default:
        return 600;
    }
  }
}
