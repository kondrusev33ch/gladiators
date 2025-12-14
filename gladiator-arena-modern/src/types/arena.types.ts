/**
 * Arena configuration types for grid-based movement system
 */

export interface GridCell {
  row: number;
  col: number;
}

export interface GridConfig {
  rows: number;
  columns: number;
}

export interface GridSize {
  rows: number;
  cols: number;
}

export interface CameraZoomLimits {
  minSize: GridSize;  // Most zoomed in (close-up): e.g., 5 rows × 8 cols
  maxSize: GridSize;  // Most zoomed out (wide): e.g., 20 rows × 30 cols
}

export interface CameraMovementBounds {
  topMargin: number;
  bottomMargin: number;
  leftMargin: number;
  rightMargin: number;
}

export interface CameraConfig {
  startPosition: GridCell;
  zoomLimits: CameraZoomLimits;
  movementBounds: CameraMovementBounds;
}

export interface GladiatorConfig {
  heightRatio: number;  // Gladiator height as multiple of cell height (e.g., 1.8)
}

export interface TeamPositions {
  teamA: GridCell[];
  teamB: GridCell[];
}

export interface StartingPositionsConfig {
  '1v1': TeamPositions;
  '2v2': TeamPositions;
  '3v3': TeamPositions;
  '5v5': TeamPositions;
  '7v7': TeamPositions;
}

export interface ArenaConfig {
  imageFile: string;
  grid: GridConfig;
  camera: CameraConfig;
  gladiator: GladiatorConfig;
  startingPositions: StartingPositionsConfig;
  movementZone: GridCell[];
}

export type BattleMode = '1v1' | '2v2' | '3v3' | '5v5' | '7v7';

export interface MovementZoneBounds {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

export interface ArenaViewport {
  width: number;
  height: number;
}

export interface GridGeometry {
  cellWidth: number;
  cellHeight: number;
  viewport: ArenaViewport;
  grid: GridConfig;
}
