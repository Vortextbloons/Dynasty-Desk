# Dynasty Desk

A realistic basketball franchise simulator that runs entirely in the browser. Manage real NBA teams, make front-office decisions, and build a dynasty — all from a static GitHub Pages app.

## Overview

Dynasty Desk is a possession-based basketball sim built around **real NBA players and teams**. You trade stars, develop rookies, manage contracts, and watch your league evolve across multiple seasons. Every player name, rating, and tendency is derived from real performance data — not randomly generated.

The game diverges from real NBA history based on your decisions. Trade Giannis, build around a late pick, or construct a dynasty that never existed in real life.

## Features

- **Real NBA data** — 36 seasons of player/team snapshots (1990–91 through 2025–26) with stat-derived ratings
- **Possession-level simulation** — every shot, turnover, rebound, and foul resolved individually
- **Full franchise management** — trades, free agency, draft, contracts, salary cap, luxury tax
- **Player development** — aging curves, training focus, morale, chemistry
- **Dynasty building** — multi-season loops, playoffs, awards, rivalries, hall of fame
- **Local-first** — IndexedDB saves, no backend, no runtime API calls
- **Export/import** — save files are portable JSON

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 19 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand |
| Storage | Dexie (IndexedDB) |
| Charts | Recharts |
| Testing | Vitest |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Data Pipeline

NBA data is imported at build time, never fetched at runtime:

```bash
# Generate NBA snapshot (requires Go)
npm run data:build

# Import real NBA data through the Python pipeline
npm run data:import

# Import only the current real-data baseline season
npm run data:import:real
```

Output ships as static JSON in `public/data/nba/`.

Current `2024-25` snapshot quality:

- `534` players with real names, heights, weights, and NBA external IDs
- `30` teams with real NBA external IDs, arena data, capacities, and colors
- Rating range: `49-98`
- `25` players rated `85+`, `68` players rated `70-84`, `441` players below `70`
- Team logos and player headshots use NBA CDN IDs with local colored fallbacks

## Project Structure

```
src/
  game/         # Sim engines, models, ratings, league logic
  store/        # Zustand state management
  db/           # Dexie save repository
  data/         # Static JSON loaders
  pages/        # UI pages
  components/   # React components
  hooks/        # Custom hooks
  tests/        # Vitest tests
scripts/        # Build-time data pipeline (Go + Python)
public/data/    # Static NBA snapshots
plans/          # Specs, milestones, and planning docs
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Typecheck + production build |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run lint` | Lint with ESLint |
| `npm run typecheck` | Typecheck without emitting |
| `npm run data:build` | Regenerate NBA snapshot |

## License

Fan project. Not affiliated with the NBA. Player and team names are used for simulation purposes.
