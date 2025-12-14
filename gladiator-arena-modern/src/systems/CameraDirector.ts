import { clamp } from '../utils/math';
import type { CameraTarget } from '../types/camera.types';
import type { GridGeometry, MovementZoneBounds, CameraConfig } from '../types/arena.types';

interface CameraState {
  panX: number;
  panY: number;
  scale: number;
  // Grid-based state for config-driven camera
  visibleRows: number;
  visibleCols: number;
  centerRow: number;
  centerCol: number;
}

interface GridCameraConfig {
  gridGeometry: GridGeometry;
  movementZoneBounds: MovementZoneBounds;
  cameraConfig?: CameraConfig;  // Config-driven camera settings
}

interface MovementZonePixelBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

/**
 * CameraDirector keeps all fighters in frame by panning/zooming the arena viewport.
 * It runs on rAF to smoothly ease toward the latest fighter bounds.
 */
export class CameraDirector {
  private layer: HTMLElement;
  private rafId: number | null = null;
  private targetsProvider: (() => CameraTarget[]) | null = null;
  private state: CameraState = {
    panX: 0,
    panY: 0,
    scale: 1,
    visibleRows: 20,
    visibleCols: 30,
    centerRow: 19,
    centerCol: 20,
  };
  private mode: 'intro' | 'action' = 'intro';
  private introEndsAt = 0;

  // Grid-based camera configuration
  private gridConfig: GridCameraConfig | null = null;
  private zoneBounds: MovementZonePixelBounds | null = null;

  // Distance tracking for smooth zoom transitions
  private currentDistance = Infinity;

  // Tunables - padding and timing
  private readonly paddingX = 92;
  private readonly paddingY = 64;
  private readonly introDuration = 1600;
  private readonly panClampFactor = 0.08; // keep pan within overscan so edges never show

  // Keep in sync with `.arena__viewport { transform-origin: 50% 68%; }`
  private readonly originXRatio = 0.5;
  private readonly originYRatio = 0.68;

  // Grid-based smart framing (padding in grid cells)
  private readonly gridPaddingRows = 2;  // Keep N rows of padding around fighters
  private readonly gridPaddingCols = 3;  // Keep N cols of padding around fighters

  // Default scale ranges (overridden by config when available)
  private readonly defaultIntroMinScale = 0.95;
  private readonly defaultIntroMaxScale = 1.04;
  private readonly defaultFocusMinScale = 1.26;
  private readonly defaultFocusMaxScale = 1.44;

  // Distance-based zoom thresholds (in pixels) - these are defaults, grid-aware values computed dynamically
  private readonly zoomTriggerDistance = 350;  // Start zooming when fighters are closer than this
  private readonly zoomMaxDistance = 120;       // Maximum zoom at this distance (close combat)

  // Grid-aware zoom thresholds (in cells)
  private readonly zoomTriggerCells = 12;  // Start zooming when fighters are within N cells
  private readonly zoomMaxCells = 4;        // Maximum zoom when fighters are within N cells

  constructor(layer: HTMLElement) {
    this.layer = layer;
    this.applyTransform();
  }

  /**
   * Configure grid-aware camera with geometry and movement zone bounds.
   * This enables smart framing based on grid cells rather than raw pixels.
   */
  setGridConfig(config: GridCameraConfig): void {
    this.gridConfig = config;
    this.zoneBounds = this.computeZonePixelBounds(config);

    // Initialize camera state from config if available
    if (config.cameraConfig) {
      const { startPosition, zoomLimits } = config.cameraConfig;
      this.state.centerRow = startPosition.row;
      this.state.centerCol = startPosition.col;
      // Start at max zoom (wide view) for intro
      this.state.visibleRows = zoomLimits.maxSize.rows;
      this.state.visibleCols = zoomLimits.maxSize.cols;
    }
  }

  /**
   * Get current grid configuration
   */
  getGridConfig(): GridCameraConfig | null {
    return this.gridConfig;
  }

  /**
   * Get zoom limits from config or use defaults
   */
  private getZoomLimits(): { minRows: number; maxRows: number; minCols: number; maxCols: number } {
    if (this.gridConfig?.cameraConfig) {
      const { minSize, maxSize } = this.gridConfig.cameraConfig.zoomLimits;
      return {
        minRows: minSize.rows,  // Most zoomed in (fewer rows visible)
        maxRows: maxSize.rows,  // Most zoomed out (more rows visible)
        minCols: minSize.cols,
        maxCols: maxSize.cols,
      };
    }
    // Default values
    return { minRows: 5, maxRows: 20, minCols: 8, maxCols: 30 };
  }

  /**
   * Convert visible rows/cols to a scale factor
   * Scale = viewport_size / (visible_cells * cell_size)
   * More visible cells = lower scale (zoomed out)
   */
  private visibleCellsToScale(visibleRows: number, visibleCols: number): number {
    if (!this.gridConfig) {
      return 1;
    }
    const { grid } = this.gridConfig.gridGeometry;
    // Scale is inverse of how many cells are visible relative to total
    // When showing all cells, scale = 1
    // When showing fewer cells, scale > 1 (zoomed in)
    const rowScale = grid.rows / visibleRows;
    const colScale = grid.columns / visibleCols;
    return Math.min(rowScale, colScale);
  }

  /**
   * Convert scale factor to visible rows/cols
   */
  private getCameraMovementBounds(): { top: number; bottom: number; left: number; right: number } {
    if (this.gridConfig?.cameraConfig) {
      const { movementBounds } = this.gridConfig.cameraConfig;
      return {
        top: movementBounds.topMargin,
        bottom: movementBounds.bottomMargin,
        left: movementBounds.leftMargin,
        right: movementBounds.rightMargin,
      };
    }
    // Default margins
    return { top: 2, bottom: 2, left: 2, right: 2 };
  }

  /**
   * Compute pixel bounds from grid-based movement zone bounds
   */
  private computeZonePixelBounds(config: GridCameraConfig): MovementZonePixelBounds {
    const { gridGeometry, movementZoneBounds } = config;
    const { cellWidth, cellHeight } = gridGeometry;
    const { minRow, maxRow, minCol, maxCol } = movementZoneBounds;

    // Convert grid bounds to pixel coordinates
    const minX = minCol * cellWidth;
    const maxX = (maxCol + 1) * cellWidth;
    const minY = minRow * cellHeight;
    const maxY = (maxRow + 1) * cellHeight;

    return {
      minX,
      maxX,
      minY,
      maxY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  start(provider: () => CameraTarget[]): void {
    this.targetsProvider = provider;
    this.mode = 'intro';
    this.introEndsAt = performance.now() + this.introDuration;

    // Initialize state from config or defaults
    const limits = this.getZoomLimits();
    const startPos = this.gridConfig?.cameraConfig?.startPosition;
    const introScale = this.visibleCellsToScale(limits.maxRows, limits.maxCols);

    this.state = {
      panX: 0,
      panY: 0,
      scale: introScale || this.defaultIntroMinScale,
      visibleRows: limits.maxRows,
      visibleCols: limits.maxCols,
      centerRow: startPos?.row ?? 19,
      centerCol: startPos?.col ?? 20,
    };
    this.applyTransform();
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => this.tick());
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.targetsProvider = null;
    this.mode = 'intro';
    this.introEndsAt = 0;
    this.currentDistance = Infinity;

    // Reset state, preserving config values if available
    const limits = this.getZoomLimits();
    const startPos = this.gridConfig?.cameraConfig?.startPosition;
    this.state = {
      panX: 0,
      panY: 0,
      scale: 1,
      visibleRows: limits.maxRows,
      visibleCols: limits.maxCols,
      centerRow: startPos?.row ?? 19,
      centerCol: startPos?.col ?? 20,
    };
    this.applyTransform();
  }

  private tick(): void {
    const now = performance.now();
    const introActive = this.mode === 'intro' && now < this.introEndsAt;
    if (!introActive && this.mode === 'intro') {
      this.mode = 'action';
    }

    const targets = this.targetsProvider?.() ?? [];
    this.updateCamera(targets, introActive);
    this.rafId = requestAnimationFrame(() => this.tick());
  }

  private updateCamera(targets: CameraTarget[], introActive: boolean): void {
    const width = this.layer.clientWidth || 1;
    const height = this.layer.clientHeight || 1;
    const originX = width * this.originXRatio;
    const originY = height * this.originYRatio;

    // During intro, show the full movement zone
    if (introActive && this.zoneBounds) {
      this.updateIntroCamera(width, height);
      return;
    }

    if (!targets.length) {
      const fallbackScale = introActive ? this.defaultIntroMinScale : 1;
      this.easeTo({ panX: 0, panY: 0, scale: fallbackScale });
      return;
    }

    // Calculate fighter bounds
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

    // Calculate distance between fighters (center to center)
    if (targets.length >= 2) {
      this.currentDistance = Math.abs(targets[0].x - targets[1].x);
    }

    // Distance-based mode switching: override intro if fighters are close enough
    const shouldZoom = this.currentDistance < this.zoomTriggerDistance;
    if (!introActive && shouldZoom && this.mode === 'intro') {
      this.mode = 'action';
    }

    // Calculate zoom progress based on distance (0 = far, 1 = close)
    const zoomProgress = this.calculateZoomProgress(this.currentDistance);

    // Get interpolated scale range based on zoom progress
    const [minScale, maxScale] = this.getScaleRange(zoomProgress);

    // Calculate padding - use grid-based padding if available
    const { padX, padY } = this.calculateSmartPadding(width, height);

    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const fitScaleX = (width - padX * 2) / spanX;
    const fitScaleY = (height - padY * 2) / spanY;
    const targetScale = clamp(Math.min(fitScaleX, fitScaleY), minScale, maxScale);

    // Calculate focus point (weighted toward feet)
    const focusX = (minX + maxX) / 2;
    const focusY = minY * 0.25 + maxY * 0.75;
    const targetPanX = -(focusX - originX) * targetScale;
    const targetPanY = -(focusY - originY) * targetScale;

    // Clamp pan to keep within movement zone bounds
    const { clampedPanX, clampedPanY } = this.clampPanToZone(
      targetPanX,
      targetPanY,
      targetScale,
      width,
      height
    );

    this.easeTo({
      panX: clampedPanX,
      panY: clampedPanY,
      scale: targetScale,
    });
  }

  /**
   * Update camera during intro phase - shows full movement zone extent
   * Uses config start position and max zoom (wide view) when available
   */
  private updateIntroCamera(width: number, height: number): void {
    const originX = width * this.originXRatio;
    const originY = height * this.originYRatio;

    // Use config-driven intro camera if available
    if (this.gridConfig?.cameraConfig) {
      const { startPosition, zoomLimits } = this.gridConfig.cameraConfig;
      const { cellWidth, cellHeight } = this.gridConfig.gridGeometry;

      // Start at max zoom (wide view) showing most of the arena
      const targetVisibleRows = zoomLimits.maxSize.rows;
      const targetVisibleCols = zoomLimits.maxSize.cols;
      const targetScale = this.visibleCellsToScale(targetVisibleRows, targetVisibleCols);

      // Center on config start position
      const focusX = (startPosition.col + 0.5) * cellWidth;
      const focusY = (startPosition.row + 0.5) * cellHeight;

      const targetPanX = -(focusX - originX) * targetScale;
      const targetPanY = -(focusY - originY) * targetScale;

      // Clamp using config-driven bounds
      const { clampedPanX, clampedPanY } = this.clampPanToZone(
        targetPanX,
        targetPanY,
        targetScale,
        width,
        height
      );

      this.easeTo({
        panX: clampedPanX,
        panY: clampedPanY,
        scale: targetScale,
        visibleRows: targetVisibleRows,
        visibleCols: targetVisibleCols,
        centerRow: startPosition.row,
        centerCol: startPosition.col,
      });
      return;
    }

    // Fallback: zone-based intro camera
    if (!this.zoneBounds) {
      this.easeTo({
        panX: 0,
        panY: 0,
        scale: this.defaultIntroMinScale,
        visibleRows: this.state.visibleRows,
        visibleCols: this.state.visibleCols,
        centerRow: this.state.centerRow,
        centerCol: this.state.centerCol,
      });
      return;
    }

    const zone = this.zoneBounds;

    // Calculate scale to fit entire movement zone with padding
    const { padX, padY } = this.calculateSmartPadding(width, height);
    const fitScaleX = (width - padX * 2) / zone.width;
    const fitScaleY = (height - padY * 2) / zone.height;
    const targetScale = clamp(
      Math.min(fitScaleX, fitScaleY),
      this.defaultIntroMinScale,
      this.defaultIntroMaxScale
    );

    // Center on movement zone
    const targetPanX = -(zone.centerX - originX) * targetScale;
    const targetPanY = -(zone.centerY - originY) * targetScale;

    // Apply gentle pan limits during intro
    const panClampX = width * this.panClampFactor * 0.6;
    const panClampY = height * this.panClampFactor * 0.6;
    const clampedPanX = clamp(targetPanX, -panClampX, panClampX);
    const clampedPanY = clamp(targetPanY, -panClampY, panClampY);

    this.easeTo({
      panX: clampedPanX,
      panY: clampedPanY,
      scale: targetScale,
      visibleRows: this.state.visibleRows,
      visibleCols: this.state.visibleCols,
      centerRow: this.state.centerRow,
      centerCol: this.state.centerCol,
    });
  }

  /**
   * Calculate smart padding based on grid cell size
   * Uses grid cells for padding when grid config is available
   */
  private calculateSmartPadding(
    width: number,
    height: number
  ): { padX: number; padY: number } {
    if (this.gridConfig) {
      const { cellWidth, cellHeight } = this.gridConfig.gridGeometry;
      return {
        padX: Math.max(this.paddingX, cellWidth * this.gridPaddingCols),
        padY: Math.max(this.paddingY, cellHeight * this.gridPaddingRows),
      };
    }

    // Fallback to pixel-based padding
    return {
      padX: Math.min(this.paddingX, width * 0.22),
      padY: Math.min(this.paddingY, height * 0.3),
    };
  }

  /**
   * Clamp pan values to keep visible area within movement zone bounds
   * Uses config-driven camera movement bounds when available
   */
  private clampPanToZone(
    panX: number,
    panY: number,
    scale: number,
    viewWidth: number,
    viewHeight: number
  ): { clampedPanX: number; clampedPanY: number } {
    if (!this.zoneBounds) {
      // Fallback to simple pan clamping
      const panClampX = viewWidth * this.panClampFactor;
      const panClampY = viewHeight * this.panClampFactor;
      return {
        clampedPanX: clamp(panX, -panClampX, panClampX),
        clampedPanY: clamp(panY, -panClampY, panClampY),
      };
    }

    // Use config-driven movement bounds if available
    if (this.gridConfig?.cameraConfig) {
      const bounds = this.getCameraMovementBounds();
      const { cellWidth, cellHeight, grid } = this.gridConfig.gridGeometry;
      const originX = viewWidth * this.originXRatio;
      const originY = viewHeight * this.originYRatio;

      // World extents (in pixels) the camera is allowed to reveal.
      // This clamps to arena image edges, inset by the configured margins (in cells).
      const worldMinX = bounds.left * cellWidth;
      const worldMaxX = (grid.columns - bounds.right) * cellWidth;
      const worldMinY = bounds.top * cellHeight;
      const worldMaxY = (grid.rows - bounds.bottom) * cellHeight;

      // Constrain pan so the viewport edges never go outside [worldMin, worldMax].
      // Mapping (scale is applied first, translate last):
      // screen = origin + (world - origin) * scale + pan
      const minPanX = (viewWidth - originX) - (worldMaxX - originX) * scale;
      const maxPanX = (originX - worldMinX) * scale - originX;
      const minPanY = (viewHeight - originY) - (worldMaxY - originY) * scale;
      const maxPanY = (originY - worldMinY) * scale - originY;

      const clampedX =
        minPanX > maxPanX ? (minPanX + maxPanX) / 2 : clamp(panX, minPanX, maxPanX);
      const clampedY =
        minPanY > maxPanY ? (minPanY + maxPanY) / 2 : clamp(panY, minPanY, maxPanY);

      return {
        clampedPanX: clampedX,
        clampedPanY: clampedY,
      };
    }

    // Fallback: zone-based clamping
    const zone = this.zoneBounds;

    // Calculate the visible area bounds at current scale
    const scaledViewWidth = viewWidth / scale;
    const scaledViewHeight = viewHeight / scale;

    // Calculate max pan to keep zone edges visible
    // Pan is in scaled space, so we need to account for scale
    const maxPanX = Math.max(0, (zone.width - scaledViewWidth) / 2) * scale;
    const maxPanY = Math.max(0, (zone.height - scaledViewHeight) / 2) * scale;

    // Add some slack to avoid hard edges
    const slack = 0.15;
    const slackX = viewWidth * slack;
    const slackY = viewHeight * slack;

    return {
      clampedPanX: clamp(panX, -maxPanX - slackX, maxPanX + slackX),
      clampedPanY: clamp(panY, -maxPanY - slackY, maxPanY + slackY),
    };
  }

  private easeTo(target: Partial<CameraState>): void {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    // Ease pan and scale
    if (target.panX !== undefined) {
      this.state.panX = lerp(this.state.panX, target.panX, 0.14);
      if (Math.abs(this.state.panX - target.panX) < 0.01) this.state.panX = target.panX;
    }
    if (target.panY !== undefined) {
      this.state.panY = lerp(this.state.panY, target.panY, 0.14);
      if (Math.abs(this.state.panY - target.panY) < 0.01) this.state.panY = target.panY;
    }
    if (target.scale !== undefined) {
      this.state.scale = lerp(this.state.scale, target.scale, 0.1);
      if (Math.abs(this.state.scale - target.scale) < 0.005) this.state.scale = target.scale;
    }

    // Ease grid-based state
    if (target.visibleRows !== undefined) {
      this.state.visibleRows = lerp(this.state.visibleRows, target.visibleRows, 0.1);
      if (Math.abs(this.state.visibleRows - target.visibleRows) < 0.1) {
        this.state.visibleRows = target.visibleRows;
      }
    }
    if (target.visibleCols !== undefined) {
      this.state.visibleCols = lerp(this.state.visibleCols, target.visibleCols, 0.1);
      if (Math.abs(this.state.visibleCols - target.visibleCols) < 0.1) {
        this.state.visibleCols = target.visibleCols;
      }
    }
    if (target.centerRow !== undefined) {
      this.state.centerRow = lerp(this.state.centerRow, target.centerRow, 0.14);
      if (Math.abs(this.state.centerRow - target.centerRow) < 0.05) {
        this.state.centerRow = target.centerRow;
      }
    }
    if (target.centerCol !== undefined) {
      this.state.centerCol = lerp(this.state.centerCol, target.centerCol, 0.14);
      if (Math.abs(this.state.centerCol - target.centerCol) < 0.05) {
        this.state.centerCol = target.centerCol;
      }
    }

    this.applyTransform();
  }

  /**
   * Calculate zoom progress based on fighter distance (0 = far apart, 1 = close combat)
   * Uses grid-aware thresholds when grid config is available
   */
  private calculateZoomProgress(distance: number): number {
    const { triggerDist, maxDist } = this.getZoomThresholds();

    if (distance >= triggerDist) return 0;
    if (distance <= maxDist) return 1;

    // Linear interpolation between trigger and max distance
    return 1 - (distance - maxDist) / (triggerDist - maxDist);
  }

  /**
   * Get zoom distance thresholds - uses grid cell size when available
   */
  private getZoomThresholds(): { triggerDist: number; maxDist: number } {
    if (this.gridConfig) {
      const { cellWidth } = this.gridConfig.gridGeometry;
      return {
        triggerDist: cellWidth * this.zoomTriggerCells,
        maxDist: cellWidth * this.zoomMaxCells,
      };
    }

    return {
      triggerDist: this.zoomTriggerDistance,
      maxDist: this.zoomMaxDistance,
    };
  }

  /**
   * Get scale range based on zoom progress (interpolates between intro and focus ranges)
   * Uses config-driven zoom limits when available
   */
  private getScaleRange(zoomProgress: number): [number, number] {
    // If we have config-driven zoom limits, calculate scale from visible cells
    if (this.gridConfig?.cameraConfig) {
      const limits = this.getZoomLimits();

      // Intro (zoomProgress=0): show more cells (maxRows/maxCols) = lower scale
      // Focus (zoomProgress=1): show fewer cells (minRows/minCols) = higher scale
      const introVisibleRows = limits.maxRows;
      const focusVisibleRows = limits.minRows;
      const targetVisibleRows = introVisibleRows + (focusVisibleRows - introVisibleRows) * zoomProgress;

      const introVisibleCols = limits.maxCols;
      const focusVisibleCols = limits.minCols;
      const targetVisibleCols = introVisibleCols + (focusVisibleCols - introVisibleCols) * zoomProgress;

      // Calculate scale based on visible cells
      const targetScale = this.visibleCellsToScale(targetVisibleRows, targetVisibleCols);

      // Return a tight range around the target (allow slight flexibility)
      const flexibility = 0.05;
      return [targetScale * (1 - flexibility), targetScale * (1 + flexibility)];
    }

    // Fallback to default scale ranges
    const minScale = this.defaultIntroMinScale +
      (this.defaultFocusMinScale - this.defaultIntroMinScale) * zoomProgress;
    const maxScale = this.defaultIntroMaxScale +
      (this.defaultFocusMaxScale - this.defaultIntroMaxScale) * zoomProgress;

    return [minScale, maxScale];
  }

  private applyTransform(): void {
    this.layer.style.setProperty('--camera-pan-x', `${this.state.panX}px`);
    this.layer.style.setProperty('--camera-pan-y', `${this.state.panY}px`);
    this.layer.style.setProperty('--camera-zoom', `${this.state.scale}`);
    this.layer.style.transform = `translate3d(${this.state.panX}px, ${this.state.panY}px, 0) scale(${this.state.scale})`;
  }
}
