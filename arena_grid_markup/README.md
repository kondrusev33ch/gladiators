# Arena Grid Markup Tool

A small standalone web app for turning an arena image into a game-ready configuration: overlay a grid, paint the walkable zone, place spawn points for each match size, set camera limits and fighter scale, then export everything as JSON.

The output is consumed by [`gladiator-arena-modern`](../gladiator-arena-modern/).

Built with Vite, TypeScript, Tailwind CSS and the Canvas API.

## Getting started

```bash
npm install
npm run dev
```

`npm run build` produces a static bundle in `dist/`; `npm run preview` serves it.

## Usage

1. **Load an image** — drag and drop or click *Load Image*. The image is drawn on a canvas and its dimensions define the cell size.
2. **Set the grid** — choose rows and columns (5–50). Cells are `imageWidth / columns` × `imageHeight / rows`. Toggle *Show Grid* as needed.
3. **Pick a mode** in the side panel:
   - **Starting Positions** — select a match type (`1v1`, `2v2`, `3v3`, `5v5`, `7v7`) and a team, then click cells to place spawn points. The counter enforces the right number per team; clicking a placed cell removes it. Each match type keeps its own set of positions.
   - **Movement Zone** — paint or erase walkable cells (drag to paint many). The zone is shared by all match types. The panel shows cell count and coverage.
   - **Camera Settings** — click the canvas to set the camera start cell, enter zoom limits (min/max visible cells) and pan margins; the allowed camera area is drawn as a dashed rectangle.
4. **Gladiator size** — the slider sets fighter height as a fraction of one cell (0.3–2.0) and previews it on the canvas.
5. **Export JSON** downloads `arena-config.json`. **Import JSON** restores a previous config (validated on load). **Clear Current** resets the active layer.

## Export format

```jsonc
{
  "imageFile": "lower_world_arena_a.png",
  "grid": { "rows": 30, "columns": 40 },

  "camera": {
    "startPosition": { "row": 19, "col": 20 },          // initial camera center
    "zoomLimits": {
      "minSize": { "rows": 10, "cols": 16 },             // tightest view (max zoom-in)
      "maxSize": { "rows": 20, "cols": 30 }              // widest view (max zoom-out)
    },
    "movementBounds": {                                  // cells the camera center may not enter
      "topMargin": 2, "bottomMargin": 2, "leftMargin": 2, "rightMargin": 2
    }
  },

  "gladiator": { "heightRatio": 1.8 },                   // fighter height in cells

  "startingPositions": {
    "1v1": { "teamA": [{ "row": 19, "col": 12 }], "teamB": [{ "row": 19, "col": 27 }] },
    "2v2": { "teamA": [], "teamB": [] },
    "3v3": { "teamA": [], "teamB": [] },
    "5v5": { "teamA": [], "teamB": [] },
    "7v7": { "teamA": [], "teamB": [] }
  },

  "movementZone": [ { "row": 3, "col": 2 }, { "row": 3, "col": 3 } ]
}
```

Rows and columns are zero-based. `startingPositions[matchType].teamA/teamB` must contain exactly 1, 2, 3, 5 or 7 cells respectively for a complete config. The type definitions are in [`src/types/index.ts`](src/types/index.ts).

## Using the output in the game

1. Copy the exported JSON to `gladiator-arena-modern/arena/config/`.
2. Copy the arena image to `gladiator-arena-modern/public/images/arena/` — the game loads it by the `imageFile` name.
3. Point `gladiator-arena-modern/src/data/arenaConfig.ts` at the new config.

## Project structure

```
src/
├── main.ts                    # App bootstrap and wiring
├── core/
│   ├── GridState.ts           # All markup data (grid, zones, positions, camera, gladiator)
│   └── MarkupManager.ts       # Coordinates modes, teams and state changes
├── components/
│   ├── ImageLoader.ts         # File picker and drag-and-drop
│   ├── GridOverlay.ts         # Canvas rendering and cell interaction
│   ├── ControlPanel.ts        # Side panel controls
│   └── ExportPanel.ts         # JSON export / import with validation
├── types/index.ts             # Config and editor types
└── styles/main.css
```

## License

MIT — see [LICENSE](../LICENSE).
