/**
 * Arena Geometry - Grid-based movement zone system
 *
 * Provides coordinate conversion between pixel space and grid cells,
 * movement zone validation, and pathfinding helpers.
 */

import { MOVEMENT } from '../data/config';
import {
  getMovementZoneBounds,
  getMovementZoneSet,
  isValidCell,
  gridToPixel as configGridToPixel,
  pixelToGrid as configPixelToGrid,
  computeGridGeometry as configComputeGridGeometry,
  findNearestValidCell,
  getRowBounds,
} from '../data/arenaConfig';
import type {
  GridCell,
  GridConfig,
  GridGeometry,
  MovementZoneBounds,
  ArenaViewport,
} from '../types/arena.types';

// Re-export types for convenience
export type { ArenaViewport, GridCell, GridConfig, GridGeometry, MovementZoneBounds };

// Re-export core functions from arenaConfig
export { isValidCell, findNearestValidCell, getRowBounds };

/**
 * Legacy EllipticalZone interface - kept for backward compatibility
 * @deprecated Use grid-based system instead
 */
export interface EllipticalZone {
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
}

/**
 * Floor geometry combining grid and legacy systems
 */
export interface FloorGeometry {
  // Grid-based properties
  grid: GridGeometry;
  bounds: MovementZoneBounds;

  // Legacy properties (for backward compatibility)
  left: number;
  right: number;
  padding: number;
  floorY: number;
  arcHeight: number;
  centerX: number;
  width: number;
  height: number;
  ellipse: EllipticalZone;
}

/**
 * Compute grid geometry from viewport
 */
export function computeGridGeometry(viewport: ArenaViewport): GridGeometry {
  return configComputeGridGeometry(viewport);
}

/**
 * Convert grid cell to pixel coordinates (center of cell)
 */
export function gridToPixel(
  row: number,
  col: number,
  geometry: GridGeometry
): { x: number; y: number } {
  return configGridToPixel(row, col, geometry);
}

/**
 * Convert pixel coordinates to grid cell
 */
export function pixelToGrid(
  x: number,
  y: number,
  geometry: GridGeometry
): GridCell {
  return configPixelToGrid(x, y, geometry);
}

/**
 * Check if a pixel position is inside the movement zone
 */
export function isInsideMovementZone(
  x: number,
  y: number,
  geometry: GridGeometry
): boolean {
  const cell = pixelToGrid(x, y, geometry);
  return isValidCell(cell.row, cell.col);
}

/**
 * Clamp a pixel position to stay within the movement zone
 * Returns the nearest valid position if outside the zone
 */
export function clampToMovementZone(
  x: number,
  y: number,
  geometry: GridGeometry
): { x: number; y: number } {
  const cell = pixelToGrid(x, y, geometry);

  if (isValidCell(cell.row, cell.col)) {
    // Inside valid zone - allow free movement within cell bounds
    return { x, y };
  }

  // Find nearest valid cell
  const nearest = findNearestValidCell(x, y, geometry);
  if (nearest) {
    return gridToPixel(nearest.row, nearest.col, geometry);
  }

  return { x, y };
}

/**
 * Get pixel X bounds for a given pixel Y position (row-based)
 */
export function getXBoundsAtY(
  y: number,
  geometry: GridGeometry
): { minX: number; maxX: number } | null {
  const row = Math.floor(y / geometry.cellHeight);
  const bounds = getRowBounds(row);

  if (!bounds) {
    return null;
  }

  return {
    minX: bounds.minCol * geometry.cellWidth,
    maxX: (bounds.maxCol + 1) * geometry.cellWidth,
  };
}

/**
 * Get pixel X bounds for a given row
 */
export function getPixelBoundsForRow(
  row: number,
  geometry: GridGeometry
): { minX: number; maxX: number } | null {
  const bounds = getRowBounds(row);

  if (!bounds) {
    return null;
  }

  // Return pixel coordinates for cell centers
  const minPixel = gridToPixel(row, bounds.minCol, geometry);
  const maxPixel = gridToPixel(row, bounds.maxCol, geometry);

  return {
    minX: minPixel.x,
    maxX: maxPixel.x,
  };
}

/**
 * Compute floor geometry with grid-based system
 * Maintains backward compatibility with legacy FloorGeometry interface
 */
export function computeFloorGeometry(
  viewport: ArenaViewport,
  fighterHalfWidth: number = 0
): FloorGeometry {
  const width = Math.max(1, viewport.width);
  const height = Math.max(1, viewport.height);

  // Compute grid geometry
  const grid = computeGridGeometry(viewport);
  const bounds = getMovementZoneBounds();

  // Calculate pixel bounds from grid bounds
  const minPixel = gridToPixel(bounds.minRow, bounds.minCol, grid);
  const maxPixel = gridToPixel(bounds.maxRow, bounds.maxCol, grid);

  // Legacy padding calculation
  const padding = Math.max(
    MOVEMENT.ARENA_PADDING,
    width * 0.12,
    fighterHalfWidth + MOVEMENT.ARENA_PADDING * 0.6
  );

  // Floor Y is derived from bottom of movement zone
  const floorYOffset = Math.max(48, height * 0.2);
  const floorY = Math.min(
    height - floorYOffset,
    maxPixel.y + grid.cellHeight / 2
  );

  // Arc height spans the movement zone vertically
  const arcHeight = maxPixel.y - minPixel.y + grid.cellHeight;

  // Left/right bounds from grid (with fighter width consideration)
  const left = Math.max(padding + fighterHalfWidth, minPixel.x - grid.cellWidth / 2 + fighterHalfWidth);
  const right = Math.min(width - padding - fighterHalfWidth, maxPixel.x + grid.cellWidth / 2 - fighterHalfWidth);

  // Create legacy ellipse approximation from grid bounds
  const ellipse: EllipticalZone = {
    centerX: (minPixel.x + maxPixel.x) / 2,
    centerY: (minPixel.y + maxPixel.y) / 2,
    radiusX: (maxPixel.x - minPixel.x) / 2 + grid.cellWidth,
    radiusY: (maxPixel.y - minPixel.y) / 2 + grid.cellHeight,
  };

  return {
    grid,
    bounds,
    left,
    right,
    padding,
    floorY,
    arcHeight,
    centerX: width / 2,
    width,
    height,
    ellipse,
  };
}

/**
 * @deprecated Use getXBoundsAtY with grid geometry instead
 * Legacy function for backward compatibility
 */
export function getEllipseXBoundsAtY(
  y: number,
  ellipse: EllipticalZone
): { minX: number; maxX: number } | null {
  const dy = y - ellipse.centerY;
  const normalizedY = dy / ellipse.radiusY;

  if (Math.abs(normalizedY) > 1) {
    return null;
  }

  const xExtent = ellipse.radiusX * Math.sqrt(1 - normalizedY * normalizedY);

  return {
    minX: ellipse.centerX - xExtent,
    maxX: ellipse.centerX + xExtent,
  };
}

/**
 * @deprecated Use isInsideMovementZone instead
 * Legacy function for backward compatibility
 */
export function isInsideEllipse(
  x: number,
  y: number,
  ellipse: EllipticalZone
): boolean {
  const dx = (x - ellipse.centerX) / ellipse.radiusX;
  const dy = (y - ellipse.centerY) / ellipse.radiusY;
  return (dx * dx + dy * dy) <= 1;
}

/**
 * @deprecated Use clampToMovementZone instead
 * Legacy function for backward compatibility
 */
export function clampToEllipse(
  x: number,
  y: number,
  ellipse: EllipticalZone
): { x: number; y: number } {
  const dx = x - ellipse.centerX;
  const dy = y - ellipse.centerY;

  const nx = dx / ellipse.radiusX;
  const ny = dy / ellipse.radiusY;
  const dist = Math.sqrt(nx * nx + ny * ny);

  if (dist <= 1) {
    return { x, y };
  }

  const scale = 1 / dist;
  return {
    x: ellipse.centerX + dx * scale,
    y: ellipse.centerY + dy * scale,
  };
}

/**
 * Get movement zone boundary as a polygon (for rendering)
 * Returns ordered list of pixel coordinates tracing the zone edge
 */
export function getMovementZoneBoundary(geometry: GridGeometry): Array<{ x: number; y: number }> {
  const bounds = getMovementZoneBounds();
  const zoneSet = getMovementZoneSet();
  const boundary: Array<{ x: number; y: number }> = [];

  // Trace the left edge (top to bottom)
  for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
    const rowBounds = getRowBounds(row);
    if (rowBounds) {
      const pixel = gridToPixel(row, rowBounds.minCol, geometry);
      boundary.push({
        x: pixel.x - geometry.cellWidth / 2,
        y: pixel.y - geometry.cellHeight / 2,
      });
    }
  }

  // Trace the bottom edge (left to right)
  const bottomRow = bounds.maxRow;
  const bottomBounds = getRowBounds(bottomRow);
  if (bottomBounds) {
    for (let col = bottomBounds.minCol; col <= bottomBounds.maxCol; col++) {
      if (zoneSet.has(`${bottomRow},${col}`)) {
        const pixel = gridToPixel(bottomRow, col, geometry);
        boundary.push({
          x: pixel.x,
          y: pixel.y + geometry.cellHeight / 2,
        });
      }
    }
  }

  // Trace the right edge (bottom to top)
  for (let row = bounds.maxRow; row >= bounds.minRow; row--) {
    const rowBounds = getRowBounds(row);
    if (rowBounds) {
      const pixel = gridToPixel(row, rowBounds.maxCol, geometry);
      boundary.push({
        x: pixel.x + geometry.cellWidth / 2,
        y: pixel.y + geometry.cellHeight / 2,
      });
    }
  }

  // Trace the top edge (right to left)
  const topRow = bounds.minRow;
  const topBounds = getRowBounds(topRow);
  if (topBounds) {
    for (let col = topBounds.maxCol; col >= topBounds.minCol; col--) {
      if (zoneSet.has(`${topRow},${col}`)) {
        const pixel = gridToPixel(topRow, col, geometry);
        boundary.push({
          x: pixel.x,
          y: pixel.y - geometry.cellHeight / 2,
        });
      }
    }
  }

  return boundary;
}

/**
 * Calculate distance between two grid cells (Chebyshev distance for 8-dir movement)
 */
export function gridDistance(from: GridCell, to: GridCell): number {
  return Math.max(Math.abs(to.row - from.row), Math.abs(to.col - from.col));
}

/**
 * Calculate Euclidean pixel distance between two cells
 */
export function pixelDistance(
  from: GridCell,
  to: GridCell,
  geometry: GridGeometry
): number {
  const fromPixel = gridToPixel(from.row, from.col, geometry);
  const toPixel = gridToPixel(to.row, to.col, geometry);

  const dx = toPixel.x - fromPixel.x;
  const dy = toPixel.y - fromPixel.y;

  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Get the grid row that corresponds to a given "lane" index
 * Maps old lane system to grid rows within the movement zone
 */
export function getLaneRow(laneIndex: number, totalLanes: number = 3): number {
  const bounds = getMovementZoneBounds();
  const zoneHeight = bounds.maxRow - bounds.minRow;

  // Map lane index to a row within the movement zone
  const ratio = (laneIndex + 0.5) / totalLanes;
  const row = Math.round(bounds.minRow + zoneHeight * ratio);

  return Math.max(bounds.minRow, Math.min(bounds.maxRow, row));
}

/**
 * Get valid rows that have cells (for lane-based strafing)
 */
export function getValidRows(): number[] {
  const bounds = getMovementZoneBounds();
  const validRows: number[] = [];

  for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
    const rowBounds = getRowBounds(row);
    if (rowBounds) {
      validRows.push(row);
    }
  }

  return validRows;
}
