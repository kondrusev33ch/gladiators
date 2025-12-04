# Gladiator Arena

A turn-based gladiator combat game built with modern web technologies.

## Tech Stack

- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Vanilla JavaScript** - No framework dependencies

## Features

- 8 unique gladiator types with different stats and abilities
- Turn-based combat system with hit/miss mechanics
- Critical hits and dodge system
- CSS-based sprite animations
- Visual effects (particles, damage numbers)
- Combat log and battle statistics
- Fully responsive design

## Project Structure

```
src/
├── components/     # UI components (Arena, Fighter, Cards, etc.)
├── core/          # Game controller, StateMachine, EventBus
├── systems/       # Combat, Animation, Effects systems
├── data/          # Gladiator definitions and configuration
├── types/         # TypeScript type definitions
├── utils/         # Helper functions
└── styles/        # CSS files (animations, base styles)
```

## Getting Started

### Install dependencies
```bash
npm install
```

### Run development server
```bash
npm run dev
```

### Build for production
```bash
npm run build
```

### Preview production build
```bash
npm run preview
```

## Development

This project uses:
- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript strict mode** for type safety
- **Path aliases** for cleaner imports (@components, @core, etc.)

## Game Mechanics

### Gladiator Stats
- **STR** (Strength) - Increases damage dealt
- **AGI** (Agility) - Affects dodge chance and critical hit chance
- **DEF** (Defense) - Reduces incoming damage
- **ACC** (Accuracy) - Increases hit chance
- **HP** (Health Points) - Total health

### Combat System
- Turn-based combat with initiative rolls
- Hit chance calculated from accuracy vs agility
- Critical hits deal 1.6x damage
- Defense reduces incoming damage
- Visual feedback for all actions

## License

MIT
