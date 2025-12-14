# Plan: Camera and Arena System with Grid-Based Movement Zone

## Overview

Implement a new arena system based on the `lower_world_arena_a_config.json` configuration file. This replaces the current ellipse-based movement zone with an explicit grid-based movement zone, adds support for predefined starting positions for different battle modes (1v1, 2v2, 3v3, 5v5, 7v7), implements config-driven camera zoom/pan constraints, and properly sizes gladiators relative to grid cells.

## Current State

- **Movement Zone**: Ellipse-based (`arenaGeometry.ts`) - dynamic calculation based on viewport
- **Starting Positions**: Percentage-based, calculated dynamically in `Fighter.ts`
- **Camera**: Tracks fighters using pixel-based bounds, hardcoded zoom levels (`CameraDirector.ts`)
- **Background**: Loaded from hardcoded path, scaled to fit viewport
- **Gladiator Size**: Fixed pixel values, not relative to arena scale

## Target State

- **Movement Zone**: Grid-based from config (30 rows x 40 cols), explicit walkable cells
- **Starting Positions**: Loaded from config for each battle mode
- **Camera**: Grid-aware with config-driven zoom limits and movement bounds
- **Background**: Image maps 1:1 to the grid coordinate system
- **Gladiator Size**: Scaled relative to grid cell size using `heightRatio`

---

## Phase 1: Arena Config Loader

### 1.1 Create Arena Config Types

**File**: `src/types/arena.types.ts`

```typescript
export interface GridCell {
  row: number;
  col: number;
}

export interface GridConfig {
  rows: number;    // 30
  columns: number; // 40
}

export interface GridSize {
  rows: number;
  cols: number;
}

export interface CameraZoomLimits {
  minSize: GridSize;  // Most zoomed in: 5 rows x 8 cols
  maxSize: GridSize;  // Most zoomed out: 20 rows x 30 cols
}

export interface CameraMovementBounds {
  topMargin: number;    // 2 cells
  bottomMargin: number; // 2 cells
  leftMargin: number;   // 2 cells
  rightMargin: number;  // 2 cells
}

export interface CameraConfig {
  startPosition: GridCell;         // Initial camera center: row 19, col 20
  zoomLimits: CameraZoomLimits;    // Min/max visible grid area
  movementBounds: CameraMovementBounds;  // Margins from grid edges
}

export interface GladiatorConfig {
  heightRatio: number;  // 1.8 = gladiator is 1.8x cell height
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
```

### 1.2 Create Arena Config Loader

**File**: `src/data/arenaConfig.ts`

- Load JSON config file
- Expose typed arena configuration
- Create movement zone lookup (Set or 2D boolean array for O(1) cell checks)
- Provide helper functions:
  - `isValidCell(row, col): boolean`
  - `getStartingPositions(mode: BattleMode): TeamPositions`
  - `cellToPixel(row, col, viewport): { x, y }`
  - `pixelToCell(x, y, viewport): GridCell`
  - `getCameraConfig(): CameraConfig`
  - `getGladiatorConfig(): GladiatorConfig`

---

## Phase 2: Grid-Based Arena Geometry

### 2.1 Update Arena Geometry Module

**File**: `src/utils/arenaGeometry.ts` (refactor)

Replace ellipse-based calculations with grid-based system:

```typescript
export interface GridGeometry {
  cellWidth: number;    // viewport.width / columns
  cellHeight: number;   // viewport.height / rows
  viewport: ArenaViewport;
  grid: GridConfig;
}

export function computeGridGeometry(viewport: ArenaViewport, grid: GridConfig): GridGeometry

export function gridToPixel(row: number, col: number, geometry: GridGeometry): { x: number, y: number }

export function pixelToGrid(x: number, y: number, geometry: GridGeometry): GridCell

export function isInsideMovementZone(row: number, col: number, movementZone: Set<string>): boolean

export function clampToMovementZone(
  x: number,
  y: number,
  geometry: GridGeometry,
  movementZone: Set<string>
): { x: number, y: number }

export function getAdjacentValidCells(
  row: number,
  col: number,
  movementZone: Set<string>
): GridCell[]
```

### 2.2 Create Movement Zone Lookup

Build efficient lookup structure from config:

```typescript
// Convert array to Set for O(1) lookups
function buildMovementZoneSet(cells: GridCell[]): Set<string> {
  return new Set(cells.map(c => `${c.row},${c.col}`));
}
```

---

## Phase 3: Fighter Position System

### 3.1 Update Fighter.ts

- Replace ellipse-based spawn/entry calculations with grid-based positions
- Use config starting positions for initial placement
- Movement clamping uses grid cell validity checks
- Add grid-aware position tracking:

```typescript
private gridPosition: GridCell;  // Current cell
private subCellOffset: { x: number, y: number };  // Smooth movement within cell
```

### 3.2 Movement Validation

- `moveBy()` validates target cell is in movement zone
- Pathfinding considers only valid movement zone cells
- Strafing (lane changes) maps to grid row changes

---

## Phase 4: Camera Director Updates

### 4.1 Grid-Aware Camera

**File**: `src/systems/CameraDirector.ts` (update)

- Accept arena config (including camera settings) on initialization
- Use config `camera.startPosition` for initial camera center (row 19, col 20)
- Camera pan bounds enforced using config `camera.movementBounds` margins
- Zoom levels constrained by config `camera.zoomLimits`

### 4.2 Camera Zoom System (Config-Driven)

```typescript
// From config: camera.zoomLimits
// minSize: { rows: 5, cols: 8 }   - Most zoomed IN (close-up)
// maxSize: { rows: 20, cols: 30 } - Most zoomed OUT (wide view)

interface CameraState {
  centerRow: number;      // Current camera center (grid row)
  centerCol: number;      // Current camera center (grid col)
  visibleRows: number;    // Current zoom level (between 5-20)
  visibleCols: number;    // Current zoom level (between 8-30)
}
```

**Zoom Calculations**:
- `zoomLevel = 0` (min zoom) → shows `maxSize` (20x30 cells) - full arena view
- `zoomLevel = 1` (max zoom) → shows `minSize` (5x8 cells) - close-up on action
- Interpolate between min/max based on current zoom level
- Maintain aspect ratio: `cols/rows` ratio should stay consistent (8/5 = 1.6)

### 4.3 Camera Pan Bounds (Config-Driven)

```typescript
// From config: camera.movementBounds
// { topMargin: 2, bottomMargin: 2, leftMargin: 2, rightMargin: 2 }

// Camera center cannot move closer than N cells from grid edge
const minCenterRow = movementBounds.topMargin + (visibleRows / 2);
const maxCenterRow = grid.rows - movementBounds.bottomMargin - (visibleRows / 2);
const minCenterCol = movementBounds.leftMargin + (visibleCols / 2);
const maxCenterCol = grid.columns - movementBounds.rightMargin - (visibleCols / 2);
```

### 4.4 Camera Mode Integration

| Mode | Behavior |
|------|----------|
| **Intro** | Start at `startPosition`, zoom from maxSize → medium zoom |
| **Follow** | Center on fighters centroid, auto-zoom to keep all visible |
| **Action** | Zoom to minSize on dramatic moments (hits, kills) |
| **Wide** | Zoom to maxSize to show full arena |

### 4.5 Auto-Zoom Logic

```typescript
function calculateOptimalZoom(fighters: Fighter[]): { rows: number, cols: number } {
  // Calculate bounding box of all fighters in grid coords
  const bounds = getFighterBounds(fighters);

  // Add padding (e.g., 2 cells around fighters)
  const padding = 2;
  const neededRows = bounds.maxRow - bounds.minRow + (padding * 2);
  const neededCols = bounds.maxCol - bounds.minCol + (padding * 2);

  // Clamp to config limits
  return {
    rows: clamp(neededRows, zoomLimits.minSize.rows, zoomLimits.maxSize.rows),
    cols: clamp(neededCols, zoomLimits.minSize.cols, zoomLimits.maxSize.cols)
  };
}
```

---

## Phase 5: Canvas Arena Rendering

### 5.1 Background Image Alignment

**File**: `src/systems/rendering/CanvasArena.ts` (update)

- Load background from config `imageFile` path
- Scale image so grid cells map correctly to pixel coordinates
- Image dimensions define authoritative grid-to-pixel mapping

### 5.2 Debug Grid Overlay (Development)

Optional debug rendering:
- Draw grid lines
- Highlight valid movement zone cells
- Show current fighter grid positions
- Starting position markers

### 5.3 Arena Boundary Rendering

Replace ellipse boundary with movement zone outline:
- Trace the outer edge of valid movement cells
- Draw boundary line following grid cell edges

---

## Phase 6: Gladiator Sizing System

### 6.1 Config-Based Gladiator Dimensions

**Config Value**: `gladiator.heightRatio: 1.8`

The gladiator's visual height is 1.8x the height of a single grid cell. This ensures gladiators scale proportionally with the arena and zoom level.

```typescript
// Calculate gladiator dimensions from grid cell size
function calculateGladiatorSize(cellHeight: number, cellWidth: number): { width: number, height: number } {
  const heightRatio = arenaConfig.gladiator.heightRatio; // 1.8

  const height = cellHeight * heightRatio;
  // Maintain sprite aspect ratio (typical gladiator sprite ~0.6 width:height)
  const width = height * 0.6; // Or use actual sprite aspect ratio

  return { width, height };
}
```

### 6.2 Dynamic Scaling with Zoom

As camera zoom changes, gladiator visual size updates:

```typescript
// In render loop
const cellHeight = viewport.height / camera.visibleRows;
const cellWidth = viewport.width / camera.visibleCols;

const gladiatorSize = calculateGladiatorSize(cellHeight, cellWidth);
// Apply to fighter sprite rendering
```

### 6.3 Update Fighter.ts Rendering

**File**: `src/components/arena/Fighter.ts`

- Remove hardcoded pixel sizes for gladiators
- Accept `GridGeometry` to calculate current cell dimensions
- Scale sprite rendering using `gladiator.heightRatio` from config
- Ensure hitbox scales proportionally with visual size

```typescript
class Fighter {
  private getVisualSize(): { width: number, height: number } {
    const cellHeight = this.gridGeometry.cellHeight;
    const heightRatio = this.arenaConfig.gladiator.heightRatio;

    const height = cellHeight * heightRatio;
    const width = height * this.spriteAspectRatio;

    return { width, height };
  }
}
```

### 6.4 Sizing Reference Table

| Zoom Level | Visible Rows | Cell Height (800px viewport) | Gladiator Height |
|------------|--------------|------------------------------|------------------|
| Max zoom (close) | 5 rows | 160px | 288px (1.8x) |
| Medium | 12 rows | 66.7px | 120px (1.8x) |
| Min zoom (wide) | 20 rows | 40px | 72px (1.8x) |

---

## Phase 7: Integration

### 7.1 Game Initialization Flow

1. Load arena config JSON
2. Build movement zone lookup
3. Compute grid geometry from viewport + config
4. Initialize camera with config settings (startPosition, zoomLimits, movementBounds)
5. Calculate gladiator size from grid cell size × heightRatio
6. Initialize fighters at config starting positions
7. Start canvas renderer with aligned background

### 7.2 Update Battle Mode Support

- Select starting positions based on battle mode (1v1, 2v2, etc.)
- Support asymmetric team sizes
- Multiple arenas support (future: load different configs)

---

## Implementation Order

1. **Phase 1**: Arena config types and loader (including camera + gladiator types)
2. **Phase 2**: Grid geometry utilities
3. **Phase 3**: Fighter grid positioning
4. **Phase 4**: Camera zoom/pan system with config constraints
5. **Phase 5**: Canvas rendering updates
6. **Phase 6**: Gladiator sizing system
7. **Phase 7**: Integration and testing

---

## File Changes Summary

| File | Change Type | Key Changes |
|------|-------------|-------------|
| `src/types/arena.types.ts` | NEW | Add `CameraConfig`, `GladiatorConfig` types |
| `src/data/arenaConfig.ts` | NEW | Load config, expose camera/gladiator settings |
| `src/utils/arenaGeometry.ts` | MAJOR REFACTOR | Grid-based coordinate conversion |
| `src/components/arena/Fighter.ts` | UPDATE | Grid positions + dynamic sizing |
| `src/systems/CameraDirector.ts` | UPDATE | Config-driven zoom/pan limits |
| `src/systems/rendering/CanvasArena.ts` | UPDATE | Scaled gladiator rendering |
| `src/data/config.ts` | UPDATE | Add arena config reference |

---

## Config Reference

The arena config (`lower_world_arena_a_config.json`) defines:

### Grid
- **Size**: 30 rows × 40 columns

### Camera Settings
- **Start Position**: row 19, col 20 (center of arena)
- **Zoom Limits**:
  - Min size (most zoomed IN): 5 rows × 8 cols
  - Max size (most zoomed OUT): 20 rows × 30 cols
- **Movement Bounds**: 2 cells margin on all sides

### Gladiator Settings
- **Height Ratio**: 1.8× cell height

### Movement Zone
- ~370 valid cells forming an irregular polygon shape
- **Vertical Extent**: Rows 14-27
- **Horizontal Extent**: Cols 4-37
- Shape: Roughly oval/stadium with irregular edges

### Starting Positions
- **Team A** (left side): Rows 19-27, Cols 11-13
- **Team B** (right side): Rows 19-27, Cols 26-28
- Supports: 1v1, 2v2, 3v3, 5v5, 7v7

---

## Notes

- The movement zone polygon is non-convex - pathfinding should use A* or similar
- Grid cell (row, col) maps to pixel position - row 0 is top, col 0 is left
- Camera should ensure all fighters are visible while maximizing zoom
- Background image aspect ratio must match grid aspect ratio for correct alignment
- Gladiator size scales dynamically with zoom level via heightRatio
- Camera zoom preserves aspect ratio (cols/rows = 1.6)
