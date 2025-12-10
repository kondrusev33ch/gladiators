/**
 * Camera framing target used by the arena camera.
 * Coordinates are in arena space with x centered on the fighter
 * and y anchored near the ground contact point.
 */
export interface CameraTarget {
  x: number;
  y: number;
  width: number;
  height: number;
}
