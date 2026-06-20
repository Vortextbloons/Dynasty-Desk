# Dynasty Desk — Agent Guide

Static browser basketball franchise sim. React + TypeScript + Vite, deployed to GitHub Pages. No runtime backend.

Full spec: `dynasty_desk_implementation_plan.md`

## Core Principles

1. **Simulation-first** — The game lives or dies on believable possession-based sim output. UI is secondary to game logic.
2. **Local-first** — IndexedDB saves, static JSON data, no live API calls in the browser.
3. **Real NBA default** — Default league uses real players/teams from build-time snapshots (`public/data/nba/`). Fictional mode is alternate only.
4. **Spec-driven** — Read the relevant plan section before coding. Pure logic first, UI second.
5. **Testable logic** — Game engines are pure functions with seeded RNG. Keep logic out of React components.

## Hard Constraints

- React + TypeScript + Vite + Tailwind + shadcn/ui + Zustand + Dexie
- No runtime backend, no private API keys, no live data fetches during gameplay
- NBA data imported at build time only (`npm run data:build` → `scripts/`)
- Use HashRouter for GitHub Pages
- Real player/team names OK; official NBA logos/trademarks are not (unless licensed)
- Add non-affiliation disclaimer in app

## Architecture

```
src/game/     ← sim, ratings, league, management (pure logic)
src/store/    ← Zustand actions call game engines, then persist saves
src/db/       ← Dexie save repository
src/data/     ← static JSON loader
src/pages/    ← thin UI; no sim math in components
scripts/      ← NBA import + ratings generation (build time)
public/data/  ← versioned snapshots (nba-2025-26, fictional-base)
```

**Flow:** User action → store action → game engine → update state → save to IndexedDB → UI re-renders.

## Data Model Essentials

- Ratings: 0–100 scale (50 = replacement, 70 = starter, 80 = all-star, 90+ = elite)
- Tendencies ≠ ratings — tendencies drive sim behavior, ratings drive success probability
- `StaticPlayer` includes `externalId` and `importMeta` for NBA traceability
- Saves are versioned; validate on import; auto-save after valid state changes

## Build Order (do not skip)

1. App shell + routing + GitHub Pages config
2. NBA data import pipeline + static snapshot
3. New league + save/load/export/import
4. Roster + player UI
5. Lineup/rotation
6. Single-game sim + box score
7. Schedule + standings + season sim
8. Playoffs
9. Trades + contracts
10. Draft + free agency
11. Fatigue/injuries/development/morale/news/awards
12. Calibration + polish

**Do not build trades/draft/FA before season simulation works end-to-end.**

## Simulation Targets

- MVP: Layer 2 possession sim (every possession simulated)
- Then: Layer 3 lineup-aware sim with substitutions
- Skip 2D animation entirely
- Validate: plausible scores, usage, 3PA, rebounds, star vs bench minutes

## Ratings Generation

- Import real NBA season stats at build time
- Regress small samples to league average
- Normalize by position, volume, efficiency, role
- Spot-check: stars (Jokic, Giannis, etc.) rate 85–95 on primary skills; bench players below starters

## When Implementing a Feature

1. Read the matching spec section in the plan
2. Define/update TypeScript types in `src/game/models/`
3. Write pure logic + Vitest tests
4. Wire into Zustand store action
5. Add UI page/component
6. Verify save/load roundtrip
7. Verify full-season sim does not crash

## Testing Priorities

- Seeded RNG determinism
- Shot/turnover/rebound/foul models
- Box score internal consistency (team points = player points sum)
- Standings updates
- Trade legality, contract math
- Save schema validation
- Distribution tests: sim 1000 games, check stat ranges

## Common Mistakes to Avoid

- Putting sim logic inside React components or hooks
- Fetching NBA data at runtime instead of using static JSON
- Replacing real player names with fictional ones in the default snapshot
- Building advanced features before the season sim spine works
- Hand-tuning star ratings instead of deriving from stats
- Storing full play-by-play for every game by default (bloats saves)
- Using BrowserRouter without GitHub Pages fallback handling

## File Naming Conventions

- Engines: `*Engine.ts` (e.g. `possessionEngine.ts`)
- Models: singular nouns in `src/game/models/`
- Pages: `*Page.tsx` in `src/pages/`
- Tests: co-located in `src/tests/` mirroring `src/game/` structure
- Scripts: `import*.ts`, `generate*.ts`, `validate*.ts` in `scripts/`

## MVP Definition of Done

A feature is done when it has a data model, updates save state, survives save/load, has acceptance criteria met, and does not break full-season simulation.

## Quick Reference — Key Pages

Home → New League → Dashboard → Roster → Player → Lineup → Schedule → Box Score → Standings → Trade Center → Free Agency → Draft → Settings

## Agent Prompt Summary

Build Dynasty Desk per `dynasty_desk_implementation_plan.md`. Static GitHub Pages app. Real NBA players from build-time JSON. Zustand + Dexie. Pure testable sim logic. Milestone order matters. No runtime APIs. No NBA logos.
