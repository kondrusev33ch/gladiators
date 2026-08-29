# Gladiator Arena

Real-time 2D gladiator combat in the browser. Pick a fighter, enter the arena, and duel a CPU opponent driven by a behavior-tree AI.

Built with **TypeScript**, **Vite**, **Tailwind CSS v4** and the **Canvas API** — no game engine, no framework.

## Getting started

Requires Node.js 20+.

```bash
npm install
npm run dev        # dev server on http://localhost:3000
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run lint` / `npm run lint:fix` | ESLint |
| `npm run format` / `npm run format:check` | Prettier |
| `npm run type-check` | `tsc --noEmit` |

## Gameplay

1. **Selection screen** — choose one of eight gladiator classes.
2. **Battle** — both fighters walk in, then fight in real time until one falls. The combat log narrates every hit, block, parry and dodge.
3. **Results** — damage, crits, dodges and misses for both sides. Fight again.

### Gladiator classes

| Class | Weapon | STR | AGI | DEF | ACC | HP | Style |
| --- | --- | :-: | :-: | :-: | :-: | :-: | --- |
| Retiarius | trident | 6 | 9 | 3 | 8 | 85 | Swift and evasive |
| Secutor | sword | 7 | 5 | 8 | 7 | 110 | Heavy armor, relentless |
| Murmillo | sword | 8 | 4 | 9 | 6 | 125 | Maximum defense and health |
| Dimachaerus | sword | 10 | 7 | 3 | 7 | 90 | Dual-wielder, highest damage |
| Thraex | sword | 7 | 7 | 6 | 7 | 100 | Well-balanced |
| Hoplomachus | spear | 7 | 5 | 7 | 9 | 105 | Precise spear strikes |
| Velites | spear | 5 | 8 | 3 | 10 | 85 | Skirmisher, rarely misses |
| Provocator | sword | 8 | 6 | 6 | 8 | 100 | Aggressive and skilled |

Definitions live in [`src/data/gladiators.ts`](src/data/gladiators.ts).

### Stats and formulas

All tunables are in [`src/data/config.ts`](src/data/config.ts).

- **Hit chance** = `65 + ACC × 4 − defender AGI × 4`, clamped to 15–95 %.
- **Critical chance** = `AGI × 1.8 %`; crits deal **1.6×** damage.
- **Damage** = `(6 + STR) × critMultiplier − defender DEF × 0.4`, minimum 1.
- **HP** is the fighter's health pool.

### Real-time combat model

The fight runs on a fixed **60 Hz** timestep (`FixedTimestep`) independent of the render loop.

- **Stamina** (max 90) is spent on attacks, dodges, dashes, parries and footwork. Regeneration pauses briefly after spending and speeds up when stamina is low.
- **Initiative** builds over time; an attack needs 60 initiative and consumes it, which spaces attacks out naturally.
- **Attack** phases: wind-up → active (hitbox live) → recovery. Attacks can be cancelled early in wind-up or recovery.
- **Block** absorbs a hit but takes chip damage (28 %) and drains stamina; a heavy enough hit breaks the guard and staggers.
- **Parry** has a short window; success stuns the attacker and lands a 1.55× counter.
- **Dodge / dash** grant invulnerability frames and cost stamina.
- **Footwork**: fighters keep a "sweet spot" distance, back-pedal out of danger range and strafe between lanes. Movement speed is expressed in grid cells per second so it scales with the arena.
- **Stagger** on heavy hits, guard breaks and parries.

### AI

`BehaviorAI` picks attacks, feints, baits, parries and evasions from a difficulty profile (`novice`, `veteran`, `champion`) that sets aggression, reaction window, mistake rate, spacing discipline and edge awareness.

### Presentation

- Layered canvas renderer (`CanvasArena`) with sprite batching and viewport culling
- Particle system (dust, blood, sparks) and dynamic sprite shadows
- Hit-stop and slow motion on crits, parries and finishing blows
- Camera shake scaled by impact force, chromatic aberration on heavy hits
- `CameraDirector` keeps both fighters framed, with zoom and pan limits taken from the arena config
- Respects `prefers-reduced-motion`

## Arena configuration

The arena is data-driven. `src/data/arenaConfig.ts` imports a JSON file produced by the [arena markup tool](../arena_grid_markup/) and exposes:

- grid dimensions and cell geometry
- the walkable **movement zone** (explicit set of cells)
- **starting positions** for `1v1`, `2v2`, `3v3`, `5v5`, `7v7`
- **camera** start position, zoom limits and pan bounds
- **gladiator height** relative to a grid cell

Files:

```
arena/config/lower_world_arena_a_config.json   # config (imported at build time via the @arena alias)
public/images/arena/lower_world_arena_a.png    # background image, loaded at runtime by imageFile
```

To add an arena: export a config from the markup tool, place it in `arena/config/`, put the image in `public/images/arena/`, and point `arenaConfig.ts` at the new JSON. The format is described in [`../arena_grid_markup/README.md`](../arena_grid_markup/README.md#export-format).

## Project structure

```
src/
├── main.ts                 # Entry point: wires screens, battle flow and combat runtime
├── core/                   # Game state, EventBus, StateMachine, ScreenManager, FixedTimestep
├── systems/
│   ├── RealTimeCombat.ts   # Combat runtime: stamina, initiative, actions, hitboxes
│   ├── Combat.ts           # Hit/crit/damage formulas
│   ├── BehaviorAI.ts       # Behavior-tree AI and difficulty profiles
│   ├── CameraDirector.ts   # Camera framing with config-driven limits
│   ├── Effects.ts          # Hit-stop, slow-mo, shake, chromatic aberration
│   └── rendering/          # CanvasArena, SpriteBatch, ParticleSystem
├── components/
│   ├── arena/              # Fighter and Sprite
│   ├── screens/            # Selection, Battle, Results
│   └── ui/                 # Button, Card, HealthBar, CombatLog
├── data/                   # gladiators.ts, config.ts (tunables), arenaConfig.ts (loader)
├── types/                  # Shared TypeScript types
├── utils/                  # math, dom, async, arenaGeometry
└── styles/                 # base, animations, sprites
arena/                      # Arena JSON configs
public/images/arena/        # Arena background images
rtc-sim.ts                  # Experimental headless combat simulation (not wired to an npm script)
```

Path aliases: `@`, `@core`, `@systems`, `@components`, `@data`, `@types`, `@utils`, `@arena` (see `vite.config.ts` and `tsconfig.json`).

## Development notes

- TypeScript strict mode with `noUnusedLocals`, `noImplicitReturns`, etc.
- ESLint + Prettier; run `npm run lint` and `npm run format:check` before committing.
- Sprites are currently emoji/CSS placeholders; real sprite sheets and an animation system are on the [roadmap](../ROADMAP.md).

## License

MIT — see [LICENSE](../LICENSE).
