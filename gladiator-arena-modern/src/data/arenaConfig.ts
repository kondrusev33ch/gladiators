/**
 * Arena Configuration Loader
 * Loads and manages grid-based arena configuration for movement zones and starting positions.
 */

import type {
  ArenaConfig,
  BattleMode,
  GridCell,
  TeamPositions,
  MovementZoneBounds,
  ArenaViewport,
  GridGeometry,
  CameraConfig,
  GladiatorConfig,
} from '../types/arena.types';

import lowerWorldArenaConfig from '@arena/config/lower_world_arena_a_config.json';

// Type assertion for imported JSON
const arenaConfig: ArenaConfig = lowerWorldArenaConfig as ArenaConfig;

// Build movement zone lookup set for O(1) cell validity checks
const movementZoneSet: Set<string> = new Set(
  arenaConfig.movementZone.map(cell => `${cell.row},${cell.col}`)
);

// Pre-compute movement zone bounds
const movementZoneBounds: MovementZoneBounds = computeMovementZoneBounds(arenaConfig.movementZone);

/**
 * Compute the bounding box of the movement zone
 */
function computeMovementZoneBounds(cells: GridCell[]): MovementZoneBounds {
  if (cells.length === 0) {
    return { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 };
  }

  let minRow = Infinity;
  let maxRow = -Infinity;
  let minCol = Infinity;
  let maxCol = -Infinity;

  for (const cell of cells) {
    minRow = Math.min(minRow, cell.row);
    maxRow = Math.max(maxRow, cell.row);
    minCol = Math.min(minCol, cell.col);
    maxCol = Math.max(maxCol, cell.col);
  }

  return { minRow, maxRow, minCol, maxCol };
}

/**
 * Get the loaded arena configuration
 */
export function getArenaConfig(): ArenaConfig {
  return arenaConfig;
}

/**
 * Get the grid dimensions
 */
export function getGridConfig() {
  return arenaConfig.grid;
}

/**
 * Get the movement zone bounds
 */
export function getMovementZoneBounds(): MovementZoneBounds {
  return movementZoneBounds;
}

/**
 * Check if a grid cell is within the valid movement zone
 */
export function isValidCell(row: number, col: number): boolean {
  return movementZoneSet.has(`${row},${col}`);
}

/**
 * Get starting positions for a specific battle mode
 */
export function getStartingPositions(mode: BattleMode): TeamPositions {
  return arenaConfig.startingPositions[mode];
}

/**
 * Get the arena background image filename
 */
export function getArenaImageFile(): string {
  return arenaConfig.imageFile;
}

/**
 * Get camera configuration (zoom limits, start position, movement bounds)
 */
export function getCameraConfig(): CameraConfig {
  return arenaConfig.camera;
}

/**
 * Get gladiator configuration (sizing ratios)
 */
export function getGladiatorConfig(): GladiatorConfig {
  return arenaConfig.gladiator;
}

/**
 * Default sprite aspect ratio (width / height)
 * Typical gladiator sprite is taller than wide
 */
// Keep this in sync with `src/styles/sprites.css` base `.sprite` dimensions (48x72).
const DEFAULT_SPRITE_ASPECT_RATIO = 48 / 72;

/**
 * Calculate gladiator dimensions based on grid cell size and config heightRatio.
 * The gladiator height scales with the cell height multiplied by heightRatio.
 * Width is derived from height using the sprite aspect ratio.
 *
 * @param geometry - Grid geometry with cell dimensions
 * @param spriteAspectRatio - Optional custom aspect ratio (width/height), defaults to 0.55
 * @returns Gladiator width and height in pixels
 */
export function calculateGladiatorSize(
  geometry: GridGeometry,
  spriteAspectRatio: number = DEFAULT_SPRITE_ASPECT_RATIO
): { width: number; height: number } {
  const heightRatio = arenaConfig.gladiator.heightRatio;
  const height = geometry.cellHeight * heightRatio;
  const width = height * spriteAspectRatio;

  return { width, height };
}

/**
 * Calculate gladiator dimensions from viewport dimensions.
 * Convenience wrapper that computes grid geometry internally.
 *
 * @param viewport - Viewport dimensions
 * @param spriteAspectRatio - Optional custom aspect ratio (width/height)
 * @returns Gladiator width and height in pixels
 */
export function calculateGladiatorSizeFromViewport(
  viewport: ArenaViewport,
  spriteAspectRatio: number = DEFAULT_SPRITE_ASPECT_RATIO
): { width: number; height: number } {
  const geometry = computeGridGeometry(viewport);
  return calculateGladiatorSize(geometry, spriteAspectRatio);
}

/**
 * Compute grid geometry based on viewport dimensions
 */
export function computeGridGeometry(viewport: ArenaViewport): GridGeometry {
  const { rows, columns } = arenaConfig.grid;
  return {
    cellWidth: viewport.width / columns,
    cellHeight: viewport.height / rows,
    viewport,
    grid: arenaConfig.grid,
  };
}

/**
 * Convert grid cell coordinates to pixel coordinates (center of cell)
 */
export function gridToPixel(
  row: number,
  col: number,
  geometry: GridGeometry
): { x: number; y: number } {
  return {
    x: (col + 0.5) * geometry.cellWidth,
    y: (row + 0.5) * geometry.cellHeight,
  };
}

/**
 * Convert pixel coordinates to grid cell
 */
export function pixelToGrid(
  x: number,
  y: number,
  geometry: GridGeometry
): GridCell {
  return {
    row: Math.floor(y / geometry.cellHeight),
    col: Math.floor(x / geometry.cellWidth),
  };
}

/**
 * Get all valid adjacent cells (8-directional) from a given cell
 */
export function getAdjacentValidCells(row: number, col: number): GridCell[] {
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],          [0, 1],
    [1, -1],  [1, 0], [1, 1],
  ];

  const adjacent: GridCell[] = [];
  for (const [dr, dc] of directions) {
    const newRow = row + dr;
    const newCol = col + dc;
    if (isValidCell(newRow, newCol)) {
      adjacent.push({ row: newRow, col: newCol });
    }
  }
  return adjacent;
}

/**
 * Get cardinal adjacent cells only (4-directional)
 */
export function getCardinalAdjacentCells(row: number, col: number): GridCell[] {
  const directions = [
    [-1, 0], // up
    [1, 0],  // down
    [0, -1], // left
    [0, 1],  // right
  ];

  const adjacent: GridCell[] = [];
  for (const [dr, dc] of directions) {
    const newRow = row + dr;
    const newCol = col + dc;
    if (isValidCell(newRow, newCol)) {
      adjacent.push({ row: newRow, col: newCol });
    }
  }
  return adjacent;
}

/**
 * Find the nearest valid cell to a given position
 */
export function findNearestValidCell(
  x: number,
  y: number,
  geometry: GridGeometry
): GridCell | null {
  const cell = pixelToGrid(x, y, geometry);

  // If current cell is valid, return it
  if (isValidCell(cell.row, cell.col)) {
    return cell;
  }

  // Search outward in expanding rings
  const maxSearchRadius = Math.max(
    arenaConfig.grid.rows,
    arenaConfig.grid.columns
  );

  for (let radius = 1; radius < maxSearchRadius; radius++) {
    let nearestCell: GridCell | null = null;
    let nearestDistSq = Infinity;

    // Check all cells at this manhattan distance
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue;

        const checkRow = cell.row + dr;
        const checkCol = cell.col + dc;

        if (isValidCell(checkRow, checkCol)) {
          const checkPixel = gridToPixel(checkRow, checkCol, geometry);
          const distSq = (checkPixel.x - x) ** 2 + (checkPixel.y - y) ** 2;
          if (distSq < nearestDistSq) {
            nearestDistSq = distSq;
            nearestCell = { row: checkRow, col: checkCol };
          }
        }
      }
    }

    if (nearestCell) {
      return nearestCell;
    }
  }

  return null;
}

/**
 * Clamp a pixel position to the nearest valid cell center
 */
export function clampToMovementZone(
  x: number,
  y: number,
  geometry: GridGeometry
): { x: number; y: number } {
  const cell = pixelToGrid(x, y, geometry);

  if (isValidCell(cell.row, cell.col)) {
    // Already in valid zone, allow sub-cell positioning
    // but clamp to cell boundaries
    const cellMinX = cell.col * geometry.cellWidth;
    const cellMaxX = (cell.col + 1) * geometry.cellWidth;
    const cellMinY = cell.row * geometry.cellHeight;
    const cellMaxY = (cell.row + 1) * geometry.cellHeight;

    return {
      x: Math.max(cellMinX, Math.min(cellMaxX, x)),
      y: Math.max(cellMinY, Math.min(cellMaxY, y)),
    };
  }

  // Find nearest valid cell and return its center
  const nearest = findNearestValidCell(x, y, geometry);
  if (nearest) {
    return gridToPixel(nearest.row, nearest.col, geometry);
  }

  // Fallback: return original position
  return { x, y };
}

/**
 * Check if movement from one cell to another is valid
 * (both cells must be in movement zone, and must be adjacent)
 */
export function isValidMove(from: GridCell, to: GridCell): boolean {
  if (!isValidCell(from.row, from.col) || !isValidCell(to.row, to.col)) {
    return false;
  }

  const rowDiff = Math.abs(to.row - from.row);
  const colDiff = Math.abs(to.col - from.col);

  // Must be adjacent (including diagonal)
  return rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0);
}

/**
 * Get all cells in a row that are valid (for lane-based movement)
 */
export function getValidCellsInRow(row: number): GridCell[] {
  const cells: GridCell[] = [];
  for (let col = 0; col < arenaConfig.grid.columns; col++) {
    if (isValidCell(row, col)) {
      cells.push({ row, col });
    }
  }
  return cells;
}

/**
 * Get the X bounds (min/max columns) for a given row
 */
export function getRowBounds(row: number): { minCol: number; maxCol: number } | null {
  let minCol = Infinity;
  let maxCol = -Infinity;

  for (let col = 0; col < arenaConfig.grid.columns; col++) {
    if (isValidCell(row, col)) {
      minCol = Math.min(minCol, col);
      maxCol = Math.max(maxCol, col);
    }
  }

  if (minCol === Infinity) {
    return null;
  }

  return { minCol, maxCol };
}

/**
 * Get contiguous valid column segments for a given row.
 * Useful for clamping movement so fighters can't slide through invalid gaps.
 */
export function getRowSegments(row: number): Array<{ minCol: number; maxCol: number }> {
  const segments: Array<{ minCol: number; maxCol: number }> = [];
  let inSegment = false;
  let segmentStart = 0;

  for (let col = 0; col < arenaConfig.grid.columns; col++) {
    const valid = isValidCell(row, col);
    if (valid && !inSegment) {
      inSegment = true;
      segmentStart = col;
    } else if (!valid && inSegment) {
      segments.push({ minCol: segmentStart, maxCol: col - 1 });
      inSegment = false;
    }
  }

  if (inSegment) {
    segments.push({ minCol: segmentStart, maxCol: arenaConfig.grid.columns - 1 });
  }

  return segments;
}

export function findNearestValidColInRow(row: number, targetCol: number): number | null {
  if (isValidCell(row, targetCol)) return targetCol;
  const segments = getRowSegments(row);
  if (!segments.length) return null;

  let bestCol: number | null = null;
  let bestDist = Infinity;

  for (const segment of segments) {
    const candidate = Math.max(segment.minCol, Math.min(segment.maxCol, targetCol));
    const dist = Math.abs(candidate - targetCol);
    if (dist < bestDist) {
      bestDist = dist;
      bestCol = candidate;
    }
  }

  return bestCol;
}

/**
 * Get the movement zone set (for external use like rendering)
 */
export function getMovementZoneSet(): Set<string> {
  return movementZoneSet;
}

/**
 * Get movement zone cells array
 */
export function getMovementZoneCells(): GridCell[] {
  return arenaConfig.movementZone;
}
