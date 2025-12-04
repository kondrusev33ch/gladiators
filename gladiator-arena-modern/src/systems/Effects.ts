/**
 * Effects - Particle system for visual effects
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  element: HTMLElement;
}

export type EffectType = 'blood' | 'impact' | 'sparkle';

export class Effects {
  private container: HTMLElement;
  private particles: Particle[] = [];
  private animationId: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Create blood particle effect
   */
  blood(x: number, y: number, count: number = 8): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 3;

      this.createParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1,
        maxLife: 1,
        size: 4 + Math.random() * 4,
        color: `rgb(${139 + Math.random() * 50}, ${26 + Math.random() * 20}, ${26 + Math.random() * 20})`,
      });
    }

    this.startAnimation();
  }

  /**
   * Create impact particle effect
   */
  impact(x: number, y: number, count: number = 6): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const speed = 1.5 + Math.random() * 2;

      this.createParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 1,
        maxLife: 1,
        size: 3 + Math.random() * 3,
        color: `rgba(196, 165, 116, ${0.6 + Math.random() * 0.4})`,
      });
    }

    this.startAnimation();
  }

  /**
   * Create sparkle particle effect
   */
  sparkle(x: number, y: number, count: number = 12): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.2;
      const speed = 1 + Math.random() * 2.5;

      this.createParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        life: 1,
        maxLife: 1,
        size: 3 + Math.random() * 2,
        color: `rgb(${255}, ${215 + Math.random() * 40}, ${0 + Math.random() * 100})`,
      });
    }

    this.startAnimation();
  }

  /**
   * Create a single particle
   */
  private createParticle(config: Omit<Particle, 'element'>): void {
    const element = document.createElement('div');
    element.className = 'particle';
    element.style.position = 'absolute';
    element.style.left = `${config.x}px`;
    element.style.top = `${config.y}px`;
    element.style.width = `${config.size}px`;
    element.style.height = `${config.size}px`;
    element.style.borderRadius = '50%';
    element.style.backgroundColor = config.color;
    element.style.pointerEvents = 'none';
    element.style.zIndex = '20';

    this.container.appendChild(element);

    this.particles.push({
      ...config,
      element,
    });
  }

  /**
   * Update all particles
   */
  private update(deltaTime: number): void {
    const gravity = 0.3;
    const decay = deltaTime / 1000;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];

      // Update physics
      particle.vy += gravity;
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life -= decay;

      // Update DOM
      particle.element.style.left = `${particle.x}px`;
      particle.element.style.top = `${particle.y}px`;
      particle.element.style.opacity = `${particle.life}`;

      // Remove dead particles
      if (particle.life <= 0) {
        particle.element.remove();
        this.particles.splice(i, 1);
      }
    }

    // Stop animation if no particles left
    if (this.particles.length === 0) {
      this.stopAnimation();
    }
  }

  /**
   * Start animation loop
   */
  private startAnimation(): void {
    if (this.animationId !== null) return;

    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      this.update(deltaTime);

      if (this.particles.length > 0) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        this.animationId = null;
      }
    };

    this.animationId = requestAnimationFrame(animate);
  }

  /**
   * Stop animation loop
   */
  private stopAnimation(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Clear all particles
   */
  clear(): void {
    this.stopAnimation();
    this.particles.forEach(p => p.element.remove());
    this.particles = [];
  }

  /**
   * Destroy the effect system
   */
  destroy(): void {
    this.clear();
  }
}
