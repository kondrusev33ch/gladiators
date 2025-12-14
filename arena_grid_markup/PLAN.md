# Arena Grid Markup Tool - Implementation Plan

## Overview

A standalone web app for visually marking up arena images with grids, starting positions for multiple match types, and movement zones.

**Location:** `/arena_grid_markup`

---

## Project Structure

```
arena_grid_markup/
├── index.html
├── package.json          # Vite + TypeScript + Tailwind
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.ts           # Entry point
│   ├── types/
│   │   └── index.ts      # Type definitions
│   ├── components/
│   │   ├── ImageLoader.ts      # Image upload/selection
│   │   ├── GridOverlay.ts      # Canvas-based grid rendering
│   │   ├── ControlPanel.ts     # UI controls
│   │   └── ExportPanel.ts      # Export configuration as JSON
│   ├── core/
│   │   ├── GridState.ts        # State management for grid cells
│   │   └── MarkupManager.ts    # Coordinates all markup operations
│   └── styles/
│       └── main.css
└── public/
    └── sample-arenas/    # Optional sample arena images
```

---

## Core Features

### 1. Image Selection

- Drag-and-drop or file picker for arena image upload
- Display image on a canvas element
- Store image dimensions for grid calculations

### 2. Grid Configuration

- Input fields for rows and columns (e.g., 10-50 range)
- Live preview: semi-transparent grid lines overlaid on the image
- Grid cells calculated as `imageWidth / columns` × `imageHeight / rows`
- Toggle grid visibility on/off

### 3. Starting Positions Mode

- **Toggle** between match types: `1v1 | 2v2 | 3v3 | 5v5 | 7v7`
- Only the **selected match type** is visible and editable at a time
- Two colors: **Blue** (Team A) and **Red** (Team B)
- Click cells to mark as starting position for selected team
- Counter shows progress (e.g., "2/3" means 2 of 3 positions placed)
- Enforce correct count per match type:
  - 1v1 = 1 blue + 1 red
  - 2v2 = 2 blue + 2 red
  - 3v3 = 3 blue + 3 red
  - 5v5 = 5 blue + 5 red
  - 7v7 = 7 blue + 7 red

### 4. Movement Zone Mode

- Click or drag to select walkable/fightable cells
- Paint/erase toggle for adding or removing cells from the zone
- Visual distinction: walkable cells highlighted, non-walkable greyed out
- Movement zone is **shared** across all match types

### 5. Mode Switching

- Radio buttons: "Starting Positions" | "Movement Zone"
- Separate data layers edited independently
- Grid overlay always visible when enabled

---

## UI Layout

```
┌────────────────────────────────────────────────────────────────┐
│  [Load Image]  │ Rows: [___] Cols: [___] │ [Show Grid ✓]       │
├────────────────┴───────────────────────────────────────────────┤
│                                                                │
│  ┌───────────────────────────────────┐  ┌───────────────────┐  │
│  │                                   │  │ MODE:             │  │
│  │                                   │  │ ● Starting Pos.   │  │
│  │         Arena Image               │  │ ○ Movement Zone   │  │
│  │         with Grid Overlay         │  ├───────────────────┤  │
│  │         (Canvas)                  │  │ MATCH TYPE:       │  │
│  │                                   │  │ [1v1] [2v2] [3v3] │  │
│  │                                   │  │ [5v5] [7v7]       │  │
│  │                                   │  ├───────────────────┤  │
│  │                                   │  │ Team A (blue): 2/3│  │
│  │                                   │  │ Team B (red):  1/3│  │
│  │                                   │  ├───────────────────┤  │
│  │                                   │  │ Placing:          │  │
│  │                                   │  │ ● Team A          │  │
│  └───────────────────────────────────┘  │ ○ Team B          │  │
│                                         ├───────────────────┤  │
│                                         │ [Clear Current]   │  │
│                                         │ [Export JSON]     │  │
│                                         │ [Import JSON]     │  │
│                                         └───────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

---

## Export Format (JSON)

```json
{
  "imageFile": "colosseum.png",
  "grid": {
    "rows": 20,
    "columns": 30
  },
  "startingPositions": {
    "1v1": {
      "teamA": [{ "row": 10, "col": 5 }],
      "teamB": [{ "row": 10, "col": 25 }]
    },
    "2v2": {
      "teamA": [
        { "row": 9, "col": 5 },
        { "row": 11, "col": 5 }
      ],
      "teamB": [
        { "row": 9, "col": 25 },
        { "row": 11, "col": 25 }
      ]
    },
    "3v3": {
      "teamA": [],
      "teamB": []
    },
    "5v5": {
      "teamA": [],
      "teamB": []
    },
    "7v7": {
      "teamA": [],
      "teamB": []
    }
  },
  "movementZone": [
    { "row": 3, "col": 2 },
    { "row": 3, "col": 3 },
    { "row": 4, "col": 2 }
  ]
}
```

---

## Type Definitions

```typescript
type MatchType = '1v1' | '2v2' | '3v3' | '5v5' | '7v7';

interface GridPosition {
  row: number;
  col: number;
}

interface TeamPositions {
  teamA: GridPosition[];
  teamB: GridPosition[];
}

interface ArenaConfig {
  imageFile: string;
  grid: {
    rows: number;
    columns: number;
  };
  startingPositions: Record<MatchType, TeamPositions>;
  movementZone: GridPosition[];
}

type EditMode = 'startingPositions' | 'movementZone';
type Team = 'teamA' | 'teamB';
type PaintMode = 'paint' | 'erase';
```

---

## Implementation Steps

### Phase 1: Project Setup
1. Initialize Vite + TypeScript project
2. Configure Tailwind CSS
3. Create basic HTML structure
4. Set up project file structure

### Phase 2: Image Loading
5. Create ImageLoader component with file input
6. Implement drag-and-drop support
7. Render uploaded image to canvas
8. Store image dimensions in state

### Phase 3: Grid System
9. Create GridOverlay component
10. Implement grid line rendering on canvas
11. Add row/column input controls
12. Implement grid visibility toggle
13. Calculate cell dimensions from image size and grid config

### Phase 4: Cell Interaction
14. Implement mouse position to grid cell conversion
15. Add click handler for cell selection
16. Add visual feedback on hover

### Phase 5: Starting Positions Mode
17. Create match type toggle buttons (1v1 through 7v7)
18. Implement team selection (Team A / Team B)
19. Add cell marking with team colors (blue/red)
20. Implement position counter per team
21. Enforce maximum positions per match type
22. Allow removing positions by clicking marked cells

### Phase 6: Movement Zone Mode
23. Implement paint/erase toggle
24. Add cell highlighting for walkable zone
25. Implement drag-to-paint for faster selection
26. Visual distinction for walkable vs non-walkable

### Phase 7: State Management
27. Create GridState class to manage all cell data
28. Implement mode switching logic
29. Add "Clear Current" functionality
30. Preserve state when switching between match types

### Phase 8: Export/Import
31. Implement JSON export with download
32. Implement JSON import to restore configuration
33. Validate imported data structure

---

---

## Phase 9: Camera Configuration

### 9.1 Camera Start Position
- Define the initial center point of the camera viewport when the arena loads
- Position expressed in **grid coordinates** (row, col) or as a **percentage** of arena dimensions
- Visual indicator on canvas: crosshair marker showing camera center
- Draggable marker for easy repositioning

### 9.2 Camera Size Constraints

#### Minimum Camera Size
- The smallest viewport the camera can zoom into (maximum zoom level)
- Expressed as either:
  - Grid cells visible: e.g., "min 5x5 cells visible"
  - Percentage of arena: e.g., "min 20% of arena width"
- Prevents zooming too close where pixelation or loss of tactical overview occurs

#### Maximum Camera Size
- The largest viewport the camera can show (minimum zoom level)
- Typically the full arena or slightly beyond
- Expressed as:
  - Grid cells visible: e.g., "max 30x20 cells visible"
  - Percentage of arena: e.g., "max 100% of arena"
- Prevents zooming out beyond useful view

### 9.3 Camera Movement Zone (Border Frame)

- Define a **rectangular boundary** the camera center cannot cross
- The camera is constrained within this frame during gameplay
- Frame defined by:
  - **Top margin**: rows from top edge camera can't enter
  - **Bottom margin**: rows from bottom edge
  - **Left margin**: columns from left edge
  - **Right margin**: columns from right edge
- Visual representation: dashed rectangle overlay showing allowed camera zone
- Purpose: prevents camera from showing areas outside the arena (black borders, UI elements, etc.)

### 9.4 Camera Configuration UI

```
┌───────────────────────────────────┐
│ CAMERA SETTINGS                   │
├───────────────────────────────────┤
│ Start Position:                   │
│   Row: [___]  Col: [___]          │
│   [Click to set on canvas]        │
├───────────────────────────────────┤
│ Zoom Limits:                      │
│   Min Size: [___] x [___] cells   │
│   Max Size: [___] x [___] cells   │
├───────────────────────────────────┤
│ Movement Bounds (margin in cells):│
│   Top: [___]    Bottom: [___]     │
│   Left: [___]   Right: [___]      │
│   [Show bounds ✓]                 │
└───────────────────────────────────┘
```

### 9.5 Camera Data Export Structure

```json
{
  "camera": {
    "startPosition": {
      "row": 10,
      "col": 15
    },
    "zoomLimits": {
      "minSize": { "rows": 5, "cols": 8 },
      "maxSize": { "rows": 20, "cols": 30 }
    },
    "movementBounds": {
      "topMargin": 2,
      "bottomMargin": 2,
      "leftMargin": 3,
      "rightMargin": 3
    }
  }
}
```

---

## Phase 10: Gladiator Size Configuration

### 10.1 Gladiator Height Definition

- Define gladiator height relative to the grid system
- Height expressed as a **fraction of cell height** (e.g., 0.8 = 80% of one cell height)
- This determines:
  - Visual scale of gladiator sprites in the game
  - Collision box proportions
  - How gladiators appear relative to arena elements

### 10.2 Size Considerations

- **Reference unit**: Grid cell height = 1.0
- **Typical range**: 0.5 to 1.5 cell heights
- **Visual preview**: Show a silhouette at the defined height on a sample cell
- Consider different gladiator types might have different sizes (future extension)

### 10.3 Gladiator Size UI

```
┌───────────────────────────────────┐
│ GLADIATOR SIZE                    │
├───────────────────────────────────┤
│ Height (relative to cell):        │
│   [====●=====] 0.85               │
│                                   │
│ Preview:                          │
│   ┌─────┐                         │
│   │  █  │ ← gladiator silhouette  │
│   │  █  │   at defined height     │
│   │  █  │                         │
│   └─────┘                         │
│   (cell)                          │
└───────────────────────────────────┘
```

### 10.4 Gladiator Size Export Structure

```json
{
  "gladiator": {
    "heightRatio": 0.85
  }
}
```

---

## Updated Export Format (Full)

```json
{
  "imageFile": "colosseum.png",
  "grid": {
    "rows": 20,
    "columns": 30
  },
  "camera": {
    "startPosition": {
      "row": 10,
      "col": 15
    },
    "zoomLimits": {
      "minSize": { "rows": 5, "cols": 8 },
      "maxSize": { "rows": 20, "cols": 30 }
    },
    "movementBounds": {
      "topMargin": 2,
      "bottomMargin": 2,
      "leftMargin": 3,
      "rightMargin": 3
    }
  },
  "gladiator": {
    "heightRatio": 0.85
  },
  "startingPositions": {
    "1v1": { "teamA": [], "teamB": [] },
    "2v2": { "teamA": [], "teamB": [] },
    "3v3": { "teamA": [], "teamB": [] },
    "5v5": { "teamA": [], "teamB": [] },
    "7v7": { "teamA": [], "teamB": [] }
  },
  "movementZone": []
}
```

---

## Updated Type Definitions

```typescript
interface CameraStartPosition {
  row: number;
  col: number;
}

interface CameraSize {
  rows: number;
  cols: number;
}

interface CameraZoomLimits {
  minSize: CameraSize;
  maxSize: CameraSize;
}

interface CameraMovementBounds {
  topMargin: number;
  bottomMargin: number;
  leftMargin: number;
  rightMargin: number;
}

interface CameraConfig {
  startPosition: CameraStartPosition;
  zoomLimits: CameraZoomLimits;
  movementBounds: CameraMovementBounds;
}

interface GladiatorConfig {
  heightRatio: number;  // Relative to cell height (1.0 = one cell)
}

// Updated ArenaConfig
interface ArenaConfig {
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
```

---

## Implementation Steps (Phases 9-10)

### Phase 9: Camera Configuration
34. Add Camera Settings panel to UI
35. Implement camera start position marker on canvas
36. Add click-to-set functionality for camera position
37. Create zoom limit input controls
38. Implement movement bounds input fields
39. Add visual overlay for camera movement bounds (dashed rectangle)
40. Integrate camera config into export/import

### Phase 10: Gladiator Size
41. Add Gladiator Size panel to UI
42. Implement height ratio slider (range: 0.3 - 2.0)
43. Create visual preview showing gladiator silhouette relative to cell
44. Integrate gladiator config into export/import
45. Validate height ratio within acceptable range

---

## Tech Stack

- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Canvas API** - Grid and image rendering
- **Vanilla JS** - No framework needed for this scope
