export type MatchType = '1v1' | '2v2' | '3v3' | '5v5' | '7v7';

export interface GridPosition {
  row: number;
  col: number;
}

export interface TeamPositions {
  teamA: GridPosition[];
  teamB: GridPosition[];
}

// Camera configuration types
export interface CameraSize {
  rows: number;
  cols: number;
}

export interface CameraZoomLimits {
  minSize: CameraSize;
  maxSize: CameraSize;
}

export interface CameraMovementBounds {
  topMargin: number;
  bottomMargin: number;
  leftMargin: number;
  rightMargin: number;
}

export interface CameraConfig {
  startPosition: GridPosition;
  zoomLimits: CameraZoomLimits;
  movementBounds: CameraMovementBounds;
}

// Gladiator configuration types
export interface GladiatorConfig {
  heightRatio: number; // Relative to cell height (1.0 = one cell)
}

export interface ArenaConfig {
  imageFile: string;
  grid: {
    rows: number;
    columns: number;
  };
  camera: CameraConfig;
  gladiator: GladiatorConfig;
  startingPositions: Record<MatchType, TeamPositions>;
  movementZone: GridPosition[];
}

export type EditMode = 'startingPositions' | 'movementZone' | 'cameraSettings';
export type Team = 'teamA' | 'teamB';
export type PaintMode = 'paint' | 'erase';
export type CameraEditTool = 'startPosition' | 'bounds';

export const MATCH_TYPES: MatchType[] = ['1v1', '2v2', '3v3', '5v5', '7v7'];

export const TEAM_SIZES: Record<MatchType, number> = {
  '1v1': 1,
  '2v2': 2,
  '3v3': 3,
  '5v5': 5,
  '7v7': 7,
};

// Gladiator size constants
export const GLADIATOR_HEIGHT_MIN = 0.3;
export const GLADIATOR_HEIGHT_MAX = 2.0;
export const GLADIATOR_HEIGHT_DEFAULT = 0.85;
