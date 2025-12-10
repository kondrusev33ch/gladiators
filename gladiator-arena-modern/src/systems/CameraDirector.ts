import { clamp } from '../utils/math';
import type { CameraTarget } from '../types/camera.types';

interface CameraState {
  panX: number;
  panY: number;
  scale: number;
}

/**
 * CameraDirector keeps all fighters in frame by panning/zooming the arena viewport.
 * It runs on rAF to smoothly ease toward the latest fighter bounds.
 */
export class CameraDirector {
  private layer: HTMLElement;
  private rafId: number | null = null;
  private targetsProvider: (() => CameraTarget[]) | null = null;
  private state: CameraState = { panX: 0, panY: 0, scale: 1 };

  // Tunables
  private readonly paddingX = 92;
  private readonly paddingY = 64;
  private readonly minScale = 1.12;
  private readonly maxScale = 1.2;
  private readonly panClampFactor = 0.06; // keep pan within overscan so edges never show

  constructor(layer: HTMLElement) {
    this.layer = layer;
    this.applyTransform();
  }

  start(provider: () => CameraTarget[]): void {
    this.targetsProvider = provider;
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => this.tick());
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.targetsProvider = null;
    this.state = { panX: 0, panY: 0, scale: 1 };
    this.applyTransform();
  }

  private tick(): void {
    const targets = this.targetsProvider?.() ?? [];
    this.updateCamera(targets);
    this.rafId = requestAnimationFrame(() => this.tick());
  }

  private updateCamera(targets: CameraTarget[]): void {
    if (!targets.length) {
      this.easeTo({ panX: 0, panY: 0, scale: 1 });
      return;
    }

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const target of targets) {
      const left = target.x - target.width / 2;
      const right = target.x + target.width / 2;
      const top = target.y - target.height;
      const bottom = target.y + target.height * 0.25;
      minX = Math.min(minX, left);
      maxX = Math.max(maxX, right);
      minY = Math.min(minY, top);
      maxY = Math.max(maxY, bottom);
    }

    const width = this.layer.clientWidth || 1;
    const height = this.layer.clientHeight || 1;
    const padX = Math.min(this.paddingX, width * 0.22);
    const padY = Math.min(this.paddingY, height * 0.3);

    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const fitScaleX = (width - padX * 2) / spanX;
    const fitScaleY = (height - padY * 2) / spanY;
    const targetScale = clamp(Math.min(fitScaleX, fitScaleY), this.minScale, this.maxScale);

    const focusX = (minX + maxX) / 2;
    const focusY = minY * 0.25 + maxY * 0.75;
    const originX = width / 2;
    const originY = height * 0.66;

    const targetPanX = -(focusX - originX) * targetScale;
    const targetPanY = -(focusY - originY) * targetScale;

    // Small pan range to avoid exposing edges even when zoomed.
    const panClampX = width * this.panClampFactor;
    const panClampY = height * this.panClampFactor;
    const clampedPanX = clamp(targetPanX, -panClampX, panClampX);
    const clampedPanY = clamp(targetPanY, -panClampY, panClampY);

    this.easeTo({ panX: clampedPanX, panY: clampedPanY, scale: targetScale });
  }

  private easeTo(target: CameraState): void {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    this.state = {
      panX: lerp(this.state.panX, target.panX, 0.14),
      panY: lerp(this.state.panY, target.panY, 0.14),
      scale: lerp(this.state.scale, target.scale, 0.1),
    };
    if (Math.abs(this.state.panX - target.panX) < 0.01) this.state.panX = target.panX;
    if (Math.abs(this.state.panY - target.panY) < 0.01) this.state.panY = target.panY;
    if (Math.abs(this.state.scale - target.scale) < 0.005) this.state.scale = target.scale;
    this.applyTransform();
  }

  private applyTransform(): void {
    this.layer.style.setProperty('--camera-pan-x', `${this.state.panX}px`);
    this.layer.style.setProperty('--camera-pan-y', `${this.state.panY}px`);
    this.layer.style.setProperty('--camera-zoom', `${this.state.scale}`);
    this.layer.style.transform = `translate3d(${this.state.panX}px, ${this.state.panY}px, 0) scale(${this.state.scale})`;
  }
}
