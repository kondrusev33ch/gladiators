/**
 * FixedTimestep - requestAnimationFrame loop with accumulator
 * Supports deterministic simulation steps for real-time combat
 */

import { eventBus, EVENTS } from './EventBus';

interface FixedTimestepConfig {
  stepMs: number;
  maxSubSteps: number;
  maxFrameMs: number;
}

export class FixedTimestep {
  private readonly config: FixedTimestepConfig;
  private accumulator = 0;
  private lastTime = 0;
  private rafId: number | null = null;
  private running = false;
  private onStep: ((stepMs: number) => void) | null = null;

  constructor(config: FixedTimestepConfig) {
    this.config = config;
  }

  /**
   * Start the RAF loop
   */
  start(onStep: (stepMs: number) => void): void {
    if (this.running) return;

    this.running = true;
    this.onStep = onStep;
    this.accumulator = 0;
    this.lastTime = performance.now();

    const tick = (time: number) => {
      if (!this.running || !this.onStep) return;

      const delta = Math.min(time - this.lastTime, this.config.maxFrameMs);
      this.lastTime = time;
      this.accumulator += delta;

      eventBus.emit(EVENTS.FRAME_START, { delta });

      let steps = 0;
      while (
        this.accumulator >= this.config.stepMs &&
        steps < this.config.maxSubSteps
      ) {
        this.onStep(this.config.stepMs);
        this.accumulator -= this.config.stepMs;
        steps++;
        eventBus.emit(EVENTS.FRAME_STEP, { step: steps, delta: this.config.stepMs });
      }

      eventBus.emit(EVENTS.FRAME_END, {
        alpha: this.accumulator / this.config.stepMs,
        remaining: this.accumulator,
      });

      if (this.running) {
        this.rafId = requestAnimationFrame(tick);
      }
    };

    this.rafId = requestAnimationFrame(tick);
  }

  /**
   * Stop the RAF loop
   */
  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.onStep = null;
    this.accumulator = 0;
    this.lastTime = 0;
  }
}
