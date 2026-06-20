# CourtForge GM — Spec-Driven Implementation Plan

**Project name:** CourtForge GM  
**Project type:** Static web basketball franchise/team manager game  
**Deployment target:** GitHub Pages  
**Primary architecture:** Local-first browser game with pre-pulled/static data and IndexedDB saves  
**Recommended stack:** React + TypeScript + Vite + Tailwind CSS + shadcn/ui + Zustand + Dexie + Recharts + Vitest  

---

## 1. Product Vision

CourtForge GM is a realistic basketball team manager game where the player controls a franchise over multiple seasons. The player manages roster construction, lineups, rotations, trades, contracts, draft picks, player development, injuries, team chemistry, free agency, playoffs, awards, and long-term dynasty building.

The game should feel like a deep basketball front-office simulator, not an arcade game. The core fun comes from making decisions, watching the simulated league react, and seeing whether the team-building strategy works over time.

The game runs entirely in the browser and can be hosted on GitHub Pages. All live gameplay data is local to the user's browser. **The default shipped experience uses real NBA players and real NBA teams** — names, positions, heights, ages, and stat-derived ratings/tendencies pulled from public basketball data and baked into static JSON at build time. Fictional league mode remains available as an alternate snapshot for users who prefer it or for builds where licensing is a concern.

Players should recognize real stars, role players, and roster construction challenges. Managing LeBron, Jokic, or a rebuilding team's young core should feel authentic because the underlying data comes from real performance profiles, not randomly generated names.

---

## 2. Core Design Principles

### 2.1 Local-first

The game should work without a backend server.

The app should support:

- Static hosting on GitHub Pages.
- Pre-pulled real NBA roster/stat data stored as versioned JSON snapshots.
- Local save games using IndexedDB.
- Export/import save files.
- No runtime dependency on paid APIs.
- No private API keys in frontend code.

### 2.2 Simulation-first

The game's quality depends mostly on the simulation engine.

The sim should prioritize:

- Realistic team stats.
- Realistic player stat lines.
- Meaningful lineup/rotation choices.
- Coaching settings that matter.
- Player tendencies separate from ratings.
- Possession-level simulation when possible.
- Validation against realistic basketball stat ranges.

### 2.3 Spec-driven development

Every major feature should have:

- Purpose.
- Data model.
- User flow.
- Game logic.
- Acceptance criteria.
- Tests where possible.

Do not build random UI screens before the underlying game rules are specified.


---

## 3. Target User Experience

### 3.1 First-time user flow

1. User opens the GitHub Pages app.
2. User clicks **New League**.
3. User chooses:
   - League size (default: 30 NBA teams).
   - Season length.
   - Difficulty.
   - **Data snapshot (default: latest real NBA season).**
   - Team to manage (real NBA franchise).
4. Game generates or loads league.
5. User lands on dashboard.
6. User reviews roster and sets rotation.
7. User simulates next game.
8. User reviews box score, standings, injuries, and news.
9. User continues through season, playoffs, offseason, draft, and free agency.

### 3.2 Returning user flow

1. User opens app.
2. App checks IndexedDB for saves.
3. User selects existing save.
4. Game loads save into Zustand.
5. User continues from last in-game date.

### 3.3 Save portability flow

1. User clicks **Export Save**.
2. App downloads a `.courtforge-save.json` file.
3. User can later click **Import Save**.
4. App validates the save version and schema.
5. App imports the save into IndexedDB.

---

## 4. Technical Stack

### 4.1 Frontend

| Layer | Choice | Reason |
|---|---|---|
| Framework | React | Component-based, good ecosystem |
| Language | TypeScript | Safer game logic and data models |
| Build tool | Vite | Fast static build, easy GitHub Pages deploy |
| Styling | Tailwind CSS | Fast UI styling |
| UI components | shadcn/ui | Good dashboard/table/dialog primitives |
| State | Zustand | Lightweight global game state |
| Local database | Dexie / IndexedDB | Large local saves without backend |
| Charts | Recharts | Player/team stat graphs |
| Testing | Vitest | Unit tests for sim engine |
| Optional E2E | Playwright | UI flow testing |
| Deployment | GitHub Actions + GitHub Pages | Static hosting |

### 4.2 Runtime constraints

Because the app is deployed to GitHub Pages:

- No Node backend at runtime.
- No server database.
- No secure environment variables.
- No private API keys.
- No server-side simulation unless added later through a separate backend.
- All runtime game logic must run in the browser.
- All saves must be local or exported/imported manually.

### 4.3 Build-time tools

The project may use local scripts before deployment:

- Import real NBA player and team data from public sources.
- Clean and normalize raw stats.
- Generate ratings and tendencies from real performance data.
- Build versioned NBA roster snapshots (e.g. `nba-2025-26`).
- Optionally generate fictional players/leagues as alternate snapshots.
- Validate generated data against real-world stat ranges.
- Export static JSON files into `public/data`.

These scripts run locally or in CI, not in the user's browser.

---

## 5. Repository Structure

```txt
courtforge-gm/
  .github/
    workflows/
      deploy.yml

  public/
    data/
      manifest.json
      nba/
        teams-nba-2025-26.json
        roster-nba-2025-26.json
        player-headshots.json          # optional; URLs or local assets if licensed
      fictional/
        teams-base.json
        roster-base.json
      shared/
        player-archetypes.json
        draft-class-templates.json
        league-rules.json
        name-pools.json

  scripts/
    import/
      importNBAStats.ts               # primary: real player season stats
      importNBARosters.ts             # real teams, rosters, bios
      importRawStats.ts               # generic fallback importer
      normalizeRawStats.ts
      calculateAdvancedStats.ts
      mapNBAPlayerIds.ts            # stable external → internal ID mapping

    generate/
      generateRatings.ts
      generateTendencies.ts
      generateNBARosterSnapshot.ts    # primary snapshot builder
      generateFictionalPlayers.ts     # alternate fictional mode only
      generateTeams.ts
      generateRosterSnapshot.ts
      generateDraftClassTemplates.ts

    validate/
      validateStaticData.ts
      validateRatings.ts
      validateRosterBalance.ts

  src/
    app/
      App.tsx
      router.tsx
      providers.tsx

    pages/
      HomePage.tsx
      NewLeaguePage.tsx
      LoadGamePage.tsx
      DashboardPage.tsx
      RosterPage.tsx
      PlayerPage.tsx
      LineupPage.tsx
      SchedulePage.tsx
      GamePreviewPage.tsx
      BoxScorePage.tsx
      StandingsPage.tsx
      TradeCenterPage.tsx
      FreeAgencyPage.tsx
      DraftPage.tsx
      ContractsPage.tsx
      LeagueNewsPage.tsx
      AwardsPage.tsx
      SettingsPage.tsx

    components/
      layout/
      nav/
      cards/
      tables/
      charts/
      dialogs/
      forms/
      game/
      player/
      team/
      league/

    data/
      loadStaticData.ts
      staticDataSchemas.ts
      dataManifest.ts

    db/
      dexie.ts
      saveRepository.ts
      migrations.ts

    store/
      useGameStore.ts
      useUiStore.ts
      useSettingsStore.ts

    game/
      core/
        ids.ts
        date.ts
        seededRandom.ts
        math.ts
        constants.ts

      models/
        player.ts
        team.ts
        league.ts
        game.ts
        save.ts
        contract.ts
        draft.ts
        injury.ts
        transaction.ts
        news.ts

      ratings/
        ratingScale.ts
        playerRatingEngine.ts
        teamRatingEngine.ts
        lineupRatingEngine.ts

      sim/
        possessionEngine.ts
        gameSimulator.ts
        shotModel.ts
        foulModel.ts
        turnoverModel.ts
        reboundModel.ts
        substitutionEngine.ts
        fatigueEngine.ts
        injuryEngine.ts
        clutchEngine.ts
        boxScoreBuilder.ts
        playByPlayBuilder.ts
        simTypes.ts

      league/
        scheduleGenerator.ts
        standingsEngine.ts
        playoffEngine.ts
        awardsEngine.ts
        seasonEngine.ts
        offseasonEngine.ts

      management/
        lineupEngine.ts
        rotationValidator.ts
        tradeEngine.ts
        tradeAi.ts
        contractEngine.ts
        freeAgencyEngine.ts
        draftEngine.ts
        scoutingEngine.ts
        developmentEngine.ts
        moraleEngine.ts
        chemistryEngine.ts

      ai/
        teamDirection.ts
        aiRosterLogic.ts
        aiTradeLogic.ts
        aiFreeAgencyLogic.ts
        aiDraftLogic.ts

    tests/
      sim/
      ratings/
      league/
      management/

  package.json
  tsconfig.json
  vite.config.ts
  tailwind.config.ts
  README.md
```

---

## 6. Static Data Strategy

### 6.1 Real NBA player data approach

The primary data pipeline uses **real NBA players and teams**. Data is imported at build time from public basketball statistics sources, normalized, converted into game ratings/tendencies, and shipped as static JSON. The browser never calls paid or private APIs at runtime.

```txt
Public NBA stats sources (build time only)
    ↓
importNBAStats / importNBARosters scripts
    ↓
Cleaned normalized player + team records
    ↓
Ratings/tendencies generator (from real stats)
    ↓
Versioned NBA roster snapshot (e.g. nba-2025-26)
    ↓
Static JSON in public/data/nba/
    ↓
Browser game loads snapshot
    ↓
User save evolves locally (trades, development, injuries, etc.)
```

#### Recommended build-time data sources

Use one or more of these during local/CI data generation (not at runtime):

| Source | Use for | Notes |
|---|---|---|
| [nba_api](https://github.com/swar/nba_api) (Python) | Rosters, bios, season stats, game logs | Unofficial; good for local import scripts |
| [Basketball Reference](https://www.basketball-reference.com/) | Historical validation, advanced stats | Scrape responsibly; cache locally |
| [balldontlie API](https://www.balldontlie.io/) | Player/team metadata | Free tier; build-time fetch only |
| Kaggle / open CSV datasets | Bulk historical seasons | Good for regression testing ratings |
| Manual CSV exports | Fallback / spot fixes | Developer-maintained overrides |

**Rule:** All external fetches happen in `scripts/` during `npm run data:build` (or similar). The shipped `dist/` bundle contains only static JSON.

#### What “real NBA players” means in-game

Each `StaticPlayer` in an NBA snapshot should include:

- Real `firstName` and `lastName`
- Real `teamId` mapped to a real NBA franchise
- Real `age`, `heightInches`, `weightLbs`, and `position` from imported data
- `externalId` (e.g. NBA player ID) for traceability and future snapshot updates
- `ratings` and `tendencies` derived from real season stats (not hand-tuned fantasy values)
- `contract` approximated from known salary data where available, or league-average placeholders for MVP

Future rookies and free agents generated after the snapshot use **fictional names** unless a new snapshot is imported. The sim league diverges from real life after the user starts playing — that is expected.

#### Snapshot versioning

Ship multiple season snapshots over time:

```txt
nba-2024-25
nba-2025-26   ← default
fictional-base
```

Users pick a snapshot in **New League**. Default selection should be the latest real NBA snapshot.

### 6.2 Fictional alternate mode

Fictional teams/players remain supported as a secondary snapshot (`fictional-base`) for:

- Testing without name recognition bias
- Builds distributed where real-player use is restricted
- Custom league experiments

Fictional mode uses the same `StaticPlayer` schema; only names and team branding differ.

### 6.3 Data source approach (summary)

```txt
Raw real NBA data (build time)
    ↓
Local import scripts
    ↓
Cleaned normalized data
    ↓
Ratings/tendencies generator
    ↓
Versioned NBA roster snapshot
    ↓
Static JSON in public/data
    ↓
Browser game loads JSON
    ↓
User save evolves locally
```

### 6.4 Static data files

#### `manifest.json`

Tracks all available roster/data snapshots. **The default snapshot must be a real NBA season.**

```json
{
  "version": "0.1.0",
  "defaultSnapshotId": "nba-2025-26",
  "snapshots": [
    {
      "id": "nba-2025-26",
      "name": "NBA 2025-26 Season",
      "type": "nba",
      "seasonLabel": "2025-26",
      "teamsFile": "/data/nba/teams-nba-2025-26.json",
      "rosterFile": "/data/nba/roster-nba-2025-26.json",
      "rulesFile": "/data/shared/league-rules.json",
      "playerCount": 450,
      "teamCount": 30
    },
    {
      "id": "fictional-base",
      "name": "Fictional League (alternate)",
      "type": "fictional",
      "teamsFile": "/data/fictional/teams-base.json",
      "rosterFile": "/data/fictional/roster-base.json",
      "rulesFile": "/data/shared/league-rules.json"
    }
  ]
}
```

#### `teams-nba-2025-26.json`

Contains **real NBA team definitions** (30 franchises). Use real city and team names. Do not ship official NBA logos in MVP unless licensed; use abbreviation badges or team colors instead.

```ts
type StaticTeam = {
  id: string;                    // internal stable ID, e.g. "team-lal"
  externalId?: string;           // NBA team ID if available
  city: string;                  // e.g. "Los Angeles"
  name: string;                  // e.g. "Lakers"
  abbreviation: string;          // e.g. "LAL"
  conference: "East" | "West";
  division: string;              // e.g. "Pacific"
  colors: {
    primary: string;
    secondary: string;
  };
  marketSize: number;
  prestige: number;
  fanPatience: number;
};
```

#### `roster-nba-2025-26.json`

Contains **real NBA players** with game-ready ratings derived from imported stats.

```ts
type StaticPlayer = {
  id: string;                    // internal stable ID
  externalId?: string;           // NBA player ID for import traceability
  firstName: string;             // real name
  lastName: string;              // real name
  age: number;
  position: "PG" | "SG" | "SF" | "PF" | "C";
  secondaryPositions: Array<"PG" | "SG" | "SF" | "PF" | "C">;
  heightInches: number;
  weightLbs: number;
  teamId: string | null;
  headshotUrl?: string;          // optional; omit if unlicensed

  ratings: PlayerRatings;
  tendencies: PlayerTendencies;
  traits: PlayerTraits;
  contract: Contract;

  importMeta?: {
    snapshotSeason: string;      // e.g. "2025-26"
    statsSource: string;         // e.g. "nba_api"
    lastUpdated: string;         // ISO date
  };
};
```

#### `player-archetypes.json`

Used for generating future draft classes and fictional free agents.

Examples:

- High-usage scoring guard.
- Defensive rim-running center.
- 3-and-D wing.
- Playmaking forward.
- Stretch big.
- Low-usage defensive specialist.
- Star heliocentric creator.
- Bench microwave scorer.

---

## 7. Save System Spec

### 7.1 Save storage

Use IndexedDB through Dexie.

Database name:

```txt
courtforge_gm
```

Tables:

```txt
saves
save_metadata
league_states
settings
```

### 7.2 Save metadata

```ts
type SaveMetadata = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  appVersion: string;
  schemaVersion: number;
  teamId: string;
  teamName: string;
  currentSeason: number;
  currentDate: string;
  leagueName: string;
};
```

### 7.3 Full save state

```ts
type GameSave = {
  metadata: SaveMetadata;
  league: LeagueState;
  user: UserManagerState;
  settings: GameSettings;
  rngState: RngState;
};
```

### 7.4 Required save features

- Create new save.
- Auto-save after major actions.
- Manual save.
- Load save.
- Delete save.
- Duplicate save.
- Export save to JSON.
- Import save from JSON.
- Validate save schema.
- Migrate old save schema versions.

### 7.5 Acceptance criteria

- User can close browser and continue later.
- User can export a save and import it into another browser.
- Corrupt save files should show a readable error.
- Old save versions should be rejected or migrated intentionally.
- Auto-save should not freeze the UI for normal-sized saves.

---

## 8. Game Domain Model

### 8.1 League

```ts
type LeagueState = {
  id: string;
  name: string;
  currentDate: string;
  seasonYear: number;
  phase: LeaguePhase;
  rules: LeagueRules;

  teams: Record<string, Team>;
  players: Record<string, Player>;
  games: Record<string, ScheduledGame>;
  standings: Record<string, TeamStanding>;
  transactions: Transaction[];
  news: NewsEvent[];
  awardsHistory: AwardSeason[];
  draftPicks: DraftPick[];
  draftClasses: Record<string, DraftClass>;
};
```

```ts
type LeaguePhase =
  | "preseason"
  | "regular_season"
  | "play_in"
  | "playoffs"
  | "offseason"
  | "draft"
  | "free_agency";
```

### 8.2 Team

```ts
type Team = {
  id: string;
  city: string;
  name: string;
  abbreviation: string;
  conference: "East" | "West";
  division?: string;

  roster: string[];
  lineup: LineupSettings;
  strategy: TeamStrategy;
  finances: TeamFinances;
  direction: TeamDirection;

  chemistry: number;
  morale: number;
  prestige: number;
};
```

### 8.3 Player

```ts
type Player = {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  position: Position;
  secondaryPositions: Position[];
  heightInches: number;
  weightLbs: number;
  teamId: string | null;

  ratings: PlayerRatings;
  tendencies: PlayerTendencies;
  traits: PlayerTraits;

  contract: Contract;
  morale: PlayerMorale;
  health: PlayerHealth;
  development: PlayerDevelopment;

  seasonStats: PlayerSeasonStats;
  careerStats: PlayerCareerStats[];
};
```

### 8.4 Ratings

All ratings should use a clear scale:

```txt
0-100 rating scale
50 = replacement-level / weak rotation skill
60 = bench-level skill
70 = starter-level skill
80 = all-star-level skill
90 = elite skill
95+ = historically elite skill
```

```ts
type PlayerRatings = {
  insideScoring: number;
  closeShot: number;
  midrange: number;
  threePoint: number;
  freeThrow: number;

  ballHandling: number;
  passing: number;
  offensiveIq: number;

  offensiveRebound: number;
  defensiveRebound: number;

  perimeterDefense: number;
  interiorDefense: number;
  steal: number;
  block: number;
  defensiveIq: number;

  speed: number;
  strength: number;
  vertical: number;
  stamina: number;
  durability: number;

  clutch: number;
  consistency: number;
  potential: number;
};
```

### 8.5 Tendencies

Tendencies are not ratings. They define behavior.

```ts
type PlayerTendencies = {
  usageRate: number;
  passRate: number;
  shotRate: number;
  driveRate: number;
  postUpRate: number;

  rimFrequency: number;
  shortMidFrequency: number;
  longMidFrequency: number;
  cornerThreeFrequency: number;
  aboveBreakThreeFrequency: number;

  threePointRate: number;
  freeThrowRate: number;
  turnoverRate: number;

  isolationRate: number;
  pickAndRollBallHandlerRate: number;
  pickAndRollRollManRate: number;
  spotUpRate: number;
  transitionRate: number;
  cutRate: number;

  foulRate: number;
  stealAttemptRate: number;
  blockAttemptRate: number;
  crashOffensiveGlassRate: number;
};
```

### 8.6 Traits

```ts
type PlayerTraits = {
  workEthic: number;
  loyalty: number;
  ego: number;
  greed: number;
  leadership: number;
  coachability: number;
  injuryRisk: number;
  shotCreation: number;
  defensiveVersatility: number;
};
```

---

## 9. Ratings Generation Spec

### 9.1 Goal

Convert raw historical or generated stats into game ratings and tendencies.

### 9.2 Input data

Primary inputs come from **real NBA season statistics** imported at build time. Potential fields:

- Points per game.
- Minutes per game.
- Field goal attempts.
- Three-point attempts.
- Three-point percentage.
- Free throw attempts.
- Free throw percentage.
- Assists.
- Turnovers.
- Offensive rebounds.
- Defensive rebounds.
- Steals.
- Blocks.
- Fouls.
- Usage rate.
- True shooting percentage.
- Effective field goal percentage.
- Age.
- Position.
- Games played.
- Team pace.

### 9.3 Regression to mean

Small-sample players should not become elite because of tiny samples.

Use weighted blending:

```txt
regressedSkill = (playerStat * sampleWeight) + (leagueAverage * (1 - sampleWeight))
```

Sample weight increases with:

- More attempts.
- More minutes.
- More games.
- Multiple seasons of data.

### 9.4 Rating normalization

Each stat should be normalized by:

- Position.
- Era or season environment.
- League average.
- Volume.
- Efficiency.
- Role.

Example:

```txt
threePointRating should consider:
- 3P%
- 3PA per 36
- shot difficulty proxy
- assisted/unassisted proxy if available
- sample size
```

### 9.5 Acceptance criteria

- Known stars (e.g. Jokic, Giannis, Luka) rate in the 85–95 range on their primary skills.
- Known bench players rate appropriately below starters on the same team.
- Low-volume shooters do not become elite 3PT shooters from small sample size.
- Centers and guards are evaluated differently where appropriate.
- Player archetypes look believable and match real playing styles.
- Generated league has a realistic distribution of stars, starters, bench players, and replacement players.
- No team should accidentally generate with 10 all-stars unless intentionally configured.
- Spot-check: sim a full season and confirm league scoring leaders resemble real NBA distributions (not exact, but plausible).

---

## 10. Simulation Engine Spec

### 10.1 Simulation philosophy

The simulator should model basketball as a sequence of possessions.

Each possession can produce:

- Turnover.
- Shot attempt.
- Foul/free throws.
- Made basket.
- Missed basket.
- Offensive rebound.
- Defensive rebound.
- Transition opportunity.
- Substitution.
- Injury event.
- End-of-quarter event.

### 10.2 Game simulation layers

#### Layer 1: Quick sim

Used for fast bulk simulation.

```txt
Team strength + pace + variance → final score + approximate stats
```

#### Layer 2: Possession sim

Main target.

```txt
Every possession is simulated.
Lineups, ratings, tendencies, fatigue, strategy, and matchups influence outcomes.
```

#### Layer 3: Lineup-aware possession sim

Adds on-court lineups and substitutions.

```txt
Tracks exact 5-player units.
Applies spacing, rim protection, rebounding, fatigue, and matchup effects.
```

#### Layer 4: Play-by-play sim

Adds narrative text.

```txt
```txt
"Jokic uses the screen, drives left, kicks to Murray in the corner... three is good."
```

### 10.3 Recommended MVP simulation target

Build **Layer 2** first, then add **Layer 3**.

Do not start with 2D animation.

### 10.4 Possession flow

```txt
Start possession
  ↓
Check period/time context
  ↓
Determine possession type:
  - half court
  - transition
  - late clock
  - end of quarter
  ↓
Select offensive action
  ↓
Select primary player
  ↓
Calculate defensive pressure
  ↓
Resolve event:
  - turnover
  - foul
  - shot
  - pass/creation
  ↓
If shot:
  - select shot zone
  - calculate make chance
  - resolve make/miss
  ↓
If miss:
  - resolve rebound
  ↓
Update stats, fatigue, clock, score
  ↓
Check substitutions
  ↓
Next possession
```

### 10.5 Possession engine inputs

```ts
type PossessionInput = {
  offense: Team;
  defense: Team;
  offenseLineup: Player[];
  defenseLineup: Player[];
  gameState: GameState;
  strategyContext: StrategyContext;
  rng: SeededRandom;
};
```

### 10.6 Possession engine output

```ts
type PossessionResult = {
  points: number;
  timeElapsedSeconds: number;
  events: PlayByPlayEvent[];
  statUpdates: StatUpdate[];
  possessionChange: boolean;
  injuryEvents: InjuryEvent[];
};
```

### 10.7 Shot model

Shot quality should consider:

- Shooter rating for selected zone.
- Defender contest.
- Teammate spacing.
- Passer creation.
- Shot difficulty.
- Fatigue.
- Morale/confidence.
- Home court.
- Clutch context.
- Random variance.

```txt
makeChance =
  baseZonePercentage
  + shooterSkillAdjustment
  + shotQualityAdjustment
  + passerAdjustment
  + spacingAdjustment
  - contestPenalty
  - fatiguePenalty
  - difficultyPenalty
  + clutchAdjustment
```

### 10.8 Shot zones

Minimum zones:

- At rim.
- Short midrange.
- Long midrange.
- Corner three.
- Above-break three.
- Free throw.

Future zones:

- Paint non-restricted.
- Left wing three.
- Right wing three.
- Top three.
- Post hook.
- Floater.

### 10.9 Turnover model

Turnovers should consider:

- Ball handler turnover tendency.
- Ball handling rating.
- Passing rating.
- Defensive pressure.
- Defensive scheme.
- Steal rating of defender.
- Fatigue.
- Pace.
- Chemistry.

### 10.10 Foul model

Fouls should consider:

- Driver foul draw tendency.
- Defender foul tendency.
- Defensive physicality setting.
- Shot zone.
- Contact level.
- Ref variance.
- Fatigue.

### 10.11 Rebound model

Rebounds should consider:

- Offensive rebound ratings.
- Defensive rebound ratings.
- Player size/position.
- Shot zone.
- Shot distance.
- Team crash glass setting.
- Defensive scheme.
- Fatigue.

### 10.12 Fatigue model

Fatigue should affect:

- Shot making.
- Defensive contest.
- Turnovers.
- Fouls.
- Injury risk.
- Transition effectiveness.
- Late-game performance.

Fatigue increases with:

- Minutes played.
- Pace.
- High usage.
- Defensive pressure.
- Age.
- Low stamina.

Fatigue decreases with:

- Bench rest.
- Timeouts, if modeled.
- Days between games.
- High stamina.
- Load management.

### 10.13 Injuries

Injury chance should consider:

- Durability.
- Existing fatigue.
- Age.
- Minutes load.
- Contact events.
- Back-to-backs.
- Injury risk trait.
- Random variance.

Injury severities:

- Minor: player can continue with penalty.
- Day-to-day: misses 1-7 days.
- Short-term: misses 1-4 weeks.
- Long-term: misses months.
- Season-ending: rare.

### 10.14 Substitution engine

Inputs:

- Target minutes.
- Player fatigue.
- Foul trouble.
- Injury status.
- Score margin.
- Quarter/time.
- Coach strategy.
- Playoff/regular season context.

Substitution rules:

- Keep at least one ball handler on court.
- Avoid impossible lineups unless user allows.
- Respect target minutes.
- Avoid playing injured players unless user allows.
- Use closing lineup late in close games.
- Use bench in blowouts.

### 10.15 End-game logic

Late-game behavior should change:

- Stars take more possessions.
- Teams foul intentionally when trailing.
- Teams slow pace when leading.
- Best free throw shooters may be targeted differently.
- Closing lineups are used.
- Timeouts can be abstracted at first.

### 10.16 Sim validation targets

The simulation should produce believable distributions for:

- Points per game.
- Possessions per game.
- Field goal attempts.
- Three-point attempts.
- Free throw attempts.
- Turnovers.
- Offensive rebounds.
- Defensive rebounds.
- Fouls.
- Assists.
- Steals.
- Blocks.
- Star player usage.
- Bench minutes.
- Blowout frequency.
- Close-game frequency.
- Home win rate.
- Playoff upset rate.

### 10.17 Acceptance criteria

- Simulated box scores look plausible.
- Star players usually lead their teams in usage.
- Low-usage players do not randomly dominate every game.
- Elite shooters take and make more threes.
- Poor spacing harms offense.
- Good rim protection reduces rim efficiency.
- Fatigue meaningfully lowers performance.
- Game scores vary naturally.
- Season standings roughly match team strength over many games.
- Upsets happen but are not pure randomness.

---

## 11. Team Strategy Spec

### 11.1 Offensive strategy

```ts
type OffensiveStrategy = {
  pace: "slow" | "balanced" | "fast";
  shotProfile: "paint" | "balanced" | "three_heavy";
  primaryAction:
    | "pick_and_roll"
    | "motion"
    | "isolation"
    | "post"
    | "transition";
  usageDistribution: "star_led" | "balanced" | "bench_involved";
  crashOffensiveGlass: "low" | "medium" | "high";
};
```

### 11.2 Defensive strategy

```ts
type DefensiveStrategy = {
  pickAndRollCoverage: "drop" | "switch" | "blitz";
  helpDefense: "conservative" | "balanced" | "aggressive";
  pressure: "low" | "medium" | "high";
  reboundingFocus: "secure_boards" | "balanced" | "leak_out";
  physicality: "conservative" | "balanced" | "physical";
};
```

### 11.3 Strategy tradeoffs

| Setting | Benefit | Cost |
|---|---|---|
| Fast pace | More transition, more possessions | More fatigue, more turnovers |
| Three-heavy | Higher scoring ceiling | More variance, more long rebounds |
| Aggressive defense | More turnovers forced | More fouls, open shots if beaten |
| Crash glass | More offensive boards | Worse transition defense |
| Switch defense | Reduces some P&R actions | Can create mismatches |
| Drop coverage | Protects paint | Gives up pull-up jumpers |
| Blitz | Forces ball out of star's hands | Creates 4-on-3 situations |

### 11.4 Acceptance criteria

- Changing pace affects possessions.
- Three-heavy strategy increases 3PA.
- Paint strategy increases rim attempts and free throw rate.
- Aggressive defense increases steals and fouls.
- Crash glass increases offensive rebounds and opponent transition chances.
- Strategy choices are visible in box score differences.

---

## 12. Lineup and Rotation Spec

### 12.1 Lineup screen requirements

User can set:

- Starters.
- Bench order.
- Target minutes.
- Position assignments.
- Closing lineup.
- Injury replacement order.
- Auto-rotation toggle.

### 12.2 Rotation constraints

- Five players on court.
- At least one eligible ball handler recommended.
- Total target minutes should equal 240.
- Injured players cannot be assigned unless injury is minor and user allows.
- Foul trouble can override rotation.

### 12.3 Lineup ratings

Each lineup should calculate:

- Spacing.
- Shot creation.
- Passing.
- Rim pressure.
- Perimeter defense.
- Interior defense.
- Rebounding.
- Transition.
- Bench balance.
- Size.
- Switchability.

### 12.4 Acceptance criteria

- Invalid rotations show warnings.
- User can auto-generate a recommended rotation.
- User can override recommendations.
- Sim respects the selected rotation.
- Closing lineup is used in close games.

---

## 13. League Structure Spec

### 13.1 League rules

```ts
type LeagueRules = {
  teamCount: number;
  regularSeasonGames: number;
  playoffTeamsPerConference: number;
  playoffSeriesLength: 1 | 3 | 5 | 7;
  salaryCapEnabled: boolean;
  salaryCap: number;
  luxuryTaxEnabled: boolean;
  maxRosterSize: number;
  minRosterSize: number;
  maxContractYears: number;
  draftRounds: number;
};
```

### 13.2 Default league

Recommended defaults:

```txt
30 teams
2 conferences
82-game season
16 playoff teams
Best-of-7 playoff series
15-player roster max
2 draft rounds
Salary cap enabled
```

For MVP, allow shorter seasons:

```txt
14 games
29 games
58 games
82 games
```

### 13.3 Schedule generation

MVP schedule:

- Balanced enough to be fun.
- Does not need exact real-world NBA scheduling complexity.
- Avoid impossible duplicate same-day games.
- Support simulation by date.
- Support sim one game, sim day, sim week, sim season.

### 13.4 Standings

Track:

- Wins.
- Losses.
- Win percentage.
- Points per game.
- Points allowed.
- Point differential.
- Conference record.
- Home/away record if home court is modeled.
- Streak.
- Last 10.

### 13.5 Playoffs

MVP:

- Top 8 teams per conference.
- Fixed bracket.
- Best-of-7 default.
- Home-court advantage based on seed.
- Series page with results.
- Champion stored in history.

### 13.6 Acceptance criteria

- Full season can be simulated without errors.
- Standings update after every game.
- Playoff bracket generates correctly.
- Champion is crowned.
- New offseason begins after playoffs.

---

## 14. Contracts and Salary Cap Spec

### 14.1 Contract model

```ts
type Contract = {
  salaryByYear: number[];
  yearsRemaining: number;
  option?: "team" | "player" | "none";
  noTradeClause?: boolean;
  guaranteed: boolean;
};
```

### 14.2 Team finances

```ts
type TeamFinances = {
  salaryCap: number;
  payroll: number;
  luxuryTaxLine: number;
  capSpace: number;
  taxBill: number;
};
```

### 14.3 MVP contract features

- Salary.
- Years remaining.
- Expiring contracts.
- Cap space.
- Free agency offers.
- Trade salary matching can be simplified.

### 14.4 Full contract features

- Rookie contracts.
- Team options.
- Player options.
- Restricted free agency.
- Bird-rights-like retention mechanic.
- Luxury tax.
- Minimum contracts.
- Mid-level exception-like mechanic.
- Buyouts.
- Extensions.

### 14.5 Acceptance criteria

- User cannot sign players if over cap unless exception rules allow.
- Expiring contracts enter free agency.
- Payroll updates after trades/signings.
- Contract length and salary affect trade value.
- Bad contracts reduce trade value.

---

## 15. Trade System Spec

### 15.1 Trade center

User can:

- Select own outgoing players/picks.
- Select target team.
- Add incoming players/picks.
- Check if trade is legal.
- See AI acceptance score.
- Submit trade.
- Use trade finder.

### 15.2 Trade value factors

Player value should consider:

- Current rating.
- Potential.
- Age.
- Contract.
- Position scarcity.
- Injury status.
- Morale.
- Team direction.
- Fit with receiving team.
- Draft pick value.

### 15.3 Team direction

```ts
type TeamDirection =
  | "contender"
  | "playoff_push"
  | "middle"
  | "retooling"
  | "rebuilding"
  | "tanking";
```

### 15.4 AI trade logic

Contenders value:

- Stars.
- Veterans.
- Defense.
- Shooting.
- Short-term upgrades.

Rebuilders value:

- Draft picks.
- Young players.
- Expiring money.
- High potential.
- Cap flexibility.

### 15.5 Trade legality

MVP rules:

- Roster size stays legal.
- Teams cannot trade injured locked players if disallowed.
- Salary matching can be simplified by difficulty setting.

Full rules:

- Salary matching.
- Trade exceptions.
- Pick protections.
- Stepien-like restrictions if desired.
- No-trade clauses.

### 15.6 Acceptance criteria

- AI rejects obviously unfair trades.
- Rebuilders behave differently from contenders.
- Bad contracts require assets to move.
- Picks have meaningful value.
- Trade completion updates rosters, contracts, news, and save state.

---

## 16. Free Agency Spec

### 16.1 Free agent screen

User can:

- View all free agents.
- Filter by position, rating, age, asking price.
- Make contract offers.
- Advance negotiation rounds.
- See interest level.
- Sign accepted players.

### 16.2 Player decision model

Free agent interest should consider:

- Salary.
- Years.
- Role.
- Team strength.
- Market/prestige.
- Loyalty.
- Chance to win.
- Playing time.
- Relationship/morale if previously on team.
- Age/career stage.

### 16.3 Free agency phases

MVP:

1. Free agency opens.
2. User submits offers.
3. AI teams submit offers.
4. Players choose best weighted offer.
5. Remaining players reduce asking price over time.

Full:

- Moratorium.
- Restricted free agency.
- Offer matching.
- Minimum signings.
- Veteran ring chasing.
- Rebuilding teams overpaying young players.

### 16.4 Acceptance criteria

- Better offers usually win but not always.
- Contenders can attract veterans.
- Rebuilders can attract players with money/role.
- Players with high loyalty are more likely to re-sign.
- Free agency fills league rosters before season starts.

---

## 17. Draft and Scouting Spec

### 17.1 Draft class generation

Each season creates a draft class using archetypes.

Prospect data:

```ts
type DraftProspect = {
  id: string;
  name: string;
  age: number;
  position: Position;
  heightInches: number;
  weightLbs: number;
  archetype: string;

  visibleRatings: Partial<PlayerRatings>;
  trueRatings: PlayerRatings;
  visiblePotentialRange: [number, number];
  truePotential: number;

  scoutingReport: string[];
  riskLevel: "low" | "medium" | "high";
  projectedRange: [number, number];
};
```

### 17.2 Scouting

User can allocate scouting points to:

- Individual prospects.
- Position groups.
- Regions.
- Archetypes.

Scouting reveals:

- More accurate ratings.
- More accurate potential.
- Work ethic.
- Injury risk.
- Hidden traits.
- Bust/steal indicators.

### 17.3 Draft night

User can:

- View draft board.
- Pick when on clock.
- Trade picks.
- Auto-draft.
- See AI picks.
- Review draft grades.

### 17.4 Acceptance criteria

- Draft classes produce stars, starters, bench players, and busts.
- Scouting reduces uncertainty but is not perfect.
- Bad teams get better picks.
- Draft picks matter in trades.
- Drafted players join rosters with rookie contracts.

---

## 18. Player Development Spec

### 18.1 Development inputs

Development should consider:

- Age.
- Potential.
- Work ethic.
- Coachability.
- Minutes played.
- Role.
- Training focus.
- Injuries.
- Morale.
- Team development quality.
- Random variance.

### 18.2 Aging curve

General curve:

```txt
18-22: high growth
23-26: moderate growth
27-31: prime
32+: decline
```

Skill-specific aging:

| Skill | Behavior |
|---|---|
| Athleticism | Peaks early, declines earlier |
| Shooting | Can improve and age well |
| Passing/IQ | Can improve with experience |
| Defense | Depends on IQ and athleticism |
| Durability | Often declines with age |
| Strength | Can improve into late 20s |

### 18.3 Player training

User can set team/player training focus:

- Shooting.
- Defense.
- Playmaking.
- Strength.
- Conditioning.
- Balanced.
- Rehab.

### 18.4 Acceptance criteria

- Young high-potential players usually improve.
- Not every prospect reaches potential.
- Injuries can slow development.
- Veterans decline believably.
- Minutes and role influence development.
- Player progression creates long-term storylines.

---

## 19. Morale and Chemistry Spec

### 19.1 Player morale inputs

Morale changes based on:

- Minutes.
- Role.
- Team success.
- Contract situation.
- Trade rumors.
- Winning/losing streaks.
- Coaching style.
- Teammate chemistry.
- Market/prestige.

### 19.2 Team chemistry inputs

Chemistry changes based on:

- Roster continuity.
- Winning.
- Leadership.
- Ego conflicts.
- Trades.
- Role clarity.
- Balanced lineups.

### 19.3 Gameplay effects

Morale and chemistry can affect:

- Free agency decisions.
- Trade requests.
- Consistency.
- Late-game performance.
- Development.
- Team news events.

### 19.4 Acceptance criteria

- Benched stars become unhappy.
- Winning improves morale.
- Constant trades hurt chemistry.
- Good leaders stabilize teams.
- Morale is meaningful but not overpowering.

---

## 20. News and Narrative Spec

### 20.1 News event types

- Game result.
- Player injury.
- Trade rumor.
- Completed trade.
- Signing.
- Draft pick.
- Award race.
- Coach/front-office pressure.
- Player morale issue.
- Record broken.
- Playoff upset.
- Championship.

### 20.2 News model

```ts
type NewsEvent = {
  id: string;
  date: string;
  type: NewsType;
  headline: string;
  body: string;
  teamIds: string[];
  playerIds: string[];
  importance: "low" | "medium" | "high";
};
```

### 20.3 Acceptance criteria

- Important league events generate news.
- Dashboard shows current important events.
- News gives life to the league.
- News does not spam low-value events.

---

## 21. Awards and Records Spec

### 21.1 Awards

MVP awards:

- Most Valuable Player.
- Defensive Player.
- Rookie of the Year.
- Sixth Man.
- Most Improved.
- Coach/Manager of the Year.
- All-League teams.
- All-Defense teams.
- All-Rookie teams.

### 21.2 Award logic

Awards should consider:

- Player stats.
- Team record.
- Efficiency.
- Minutes.
- Role.
- Defensive stats.
- Narrative bonuses.

### 21.3 Records

Track:

- Single-game points.
- Single-game assists.
- Single-game rebounds.
- Season points per game.
- Career points.
- Team wins.
- Championships.
- Playoff records.

### 21.4 Acceptance criteria

- Star players on winning teams are MVP candidates.
- Rookies are eligible only in rookie season.
- Sixth man requires bench role.
- Records persist across seasons.

---

## 22. UI Specification

### 22.1 Visual style

CourtForge GM should feel like a clean front-office dashboard.

Recommended style:

- Dark mode first.
- Slate/near-black background.
- Accent color: orange, teal, or gold.
- Card-based dashboard.
- Dense but readable tables.
- Minimal animations.
- Clear hierarchy.
- Charts for trends.
- Mobile usable, desktop optimized.

### 22.2 Core pages

#### Home page

Features:

- New League.
- Load Game.
- Import Save.
- About/How to Play.

#### New League page

Inputs:

- League name.
- Manager name.
- Team selection.
- Season length.
- Difficulty.
- Data snapshot (default: latest NBA season; fictional alternate available).
- Salary cap on/off.
- Injuries on/off.

#### Dashboard

Shows:

- Team record.
- Next game.
- Current league phase.
- Team rating summary.
- Injuries.
- Morale alerts.
- News.
- Quick sim buttons.

#### Roster page

Shows:

- Player table.
- Ratings.
- Contract.
- Morale.
- Health.
- Role.
- Stats.
- Sort/filter.

#### Player page

Shows:

- Bio.
- Ratings.
- Tendencies.
- Contract.
- Stats.
- Development history.
- Morale/health.
- Trade value.

#### Lineup page

Shows:

- Starters.
- Bench.
- Target minutes.
- Closing lineup.
- Auto-generate rotation.
- Validation warnings.

#### Schedule page

Shows:

- Past/future games.
- Sim next game.
- Sim day/week/month.
- Game previews.

#### Box score page

Shows:

- Final score.
- Team stats.
- Player stats.
- Scoring by quarter.
- Key performers.
- Optional play-by-play.

#### Standings page

Shows:

- Conference standings.
- League standings.
- Streaks.
- Point differential.
- Playoff picture.

#### Trade center

Shows:

- Trade builder.
- Team rosters.
- Pick assets.
- Salary matching.
- AI interest.
- Trade result.

#### Free agency

Shows:

- Free agent list.
- Contract offers.
- Interest level.
- Negotiation round.

#### Draft page

Shows:

- Draft board.
- Prospect list.
- Scouting reports.
- Draft picks.
- Mock draft.
- Draft night interface.

#### Contracts page

Shows:

- Payroll.
- Cap space.
- Upcoming free agents.
- Contract years.
- Team options/player options if implemented.

#### News page

Shows:

- League news feed.
- Team-specific filters.
- Important events.

#### Awards page

Shows:

- Current award races.
- Past winners.
- All-league teams.

#### Settings page

Shows:

- Difficulty.
- Simulation speed.
- Auto-save.
- Import/export.
- Reset data.
- Accessibility options.

### 22.3 Acceptance criteria

- User can navigate every major system from sidebar or top nav.
- Tables are sortable.
- Critical warnings are visible.
- Sim buttons are easy to find.
- Game state changes are reflected immediately.
- UI works at desktop sizes first.
- Mobile layout does not completely break.

---

## 23. State Management Spec

### 23.1 Zustand stores

Use separate stores:

```txt
useGameStore
  active save/league state

useUiStore
  dialogs, selected tabs, filters

useSettingsStore
  local app preferences
```

### 23.2 Store principles

- Game logic should not be deeply embedded in React components.
- Components should call actions.
- Actions should call game engines.
- Game engines should be pure or mostly pure functions.
- Save writes should happen after successful state updates.

### 23.3 Example action flow

```txt
User clicks Sim Next Game
  ↓
DashboardPage calls gameStore.simNextGame()
  ↓
simNextGame finds next scheduled game
  ↓
gameSimulator simulates game
  ↓
standingsEngine updates standings
  ↓
newsEngine creates events
  ↓
saveRepository persists updated save
  ↓
UI updates
```

### 23.4 Acceptance criteria

- Major game actions are centralized.
- Components are not responsible for sim calculations.
- State updates are predictable.
- Sim functions can be unit tested without rendering UI.

---

## 24. Testing Strategy

### 24.1 Unit tests

Test:

- Seeded RNG.
- Rating generation.
- Shot model.
- Turnover model.
- Rebound model.
- Fatigue model.
- Injury model.
- Box score totals.
- Standings updates.
- Trade legality.
- Contract calculations.
- Draft generation.
- Save validation.

### 24.2 Simulation tests

Run many simulations and check distributions.

Examples:

```txt
Sim 1,000 games with average teams:
- Average score should be plausible.
- Average possessions should be plausible.
- Turnovers should be plausible.
- 3PA should be plausible.
```

```txt
Elite offense vs poor defense:
- Elite offense should score more on average.
```

```txt
High pace vs slow pace:
- High pace should create more possessions.
```

### 24.3 UI tests

Optional Playwright tests:

- Create new league.
- Set lineup.
- Sim game.
- View box score.
- Save/load.
- Export/import.

### 24.4 Acceptance criteria

- Core sim tests pass before each release.
- No game action produces impossible box score totals.
- No full-season sim crashes.
- Save/load roundtrip preserves league state.

---

## 25. Performance Requirements

### 25.1 Performance goals

- Initial app load should be fast enough for GitHub Pages.
- New league creation should finish in a reasonable browser time.
- Sim one game should feel instant or near-instant.
- Sim full season should show progress if it takes noticeable time.
- Large saves should not lock the UI unnecessarily.

### 25.2 Performance techniques

- Use static JSON chunking.
- Lazy load heavy pages.
- Keep sim pure and efficient.
- Use Web Workers later for full-season simulation if needed.
- Avoid storing redundant huge play-by-play logs unless enabled.
- Store summarized results by default.

### 25.3 Web Worker future upgrade

Move heavy simulation into:

```txt
src/workers/simWorker.ts
```

Useful for:

- Sim full season.
- Sim multiple seasons.
- Run calibration tests.
- Generate draft classes.

---

## 26. Deployment Spec

### 26.1 Vite config

If deployed to:

```txt
https://username.github.io/courtforge-gm/
```

Set:

```ts
export default defineConfig({
  base: "/courtforge-gm/",
  plugins: [react()]
});
```

### 26.2 GitHub Actions deployment

Workflow:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run data:build   # refresh NBA snapshot if source data changed
      - run: npm run test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/deploy-pages@v4
```

### 26.3 Acceptance criteria

- Push to main builds app.
- Tests run before deploy.
- Static data included in build.
- App loads correctly from GitHub Pages base path.
- Refreshing deep routes works, or routing uses hash router.

### 26.4 Routing note

For GitHub Pages, easiest routing is:

```txt
HashRouter
```

Example URL:

```txt
https://username.github.io/courtforge-gm/#/dashboard
```

This avoids refresh issues with static hosting.

---

## 27. MVP Scope

### 27.1 MVP goal

A playable single-player basketball franchise sim that can:

- Start a league.
- Pick a team.
- View roster.
- Set rotation.
- Sim games.
- Produce box scores.
- Update standings.
- Sim a season.
- Run playoffs.
- Save/load locally.

### 27.2 MVP features

#### Must have

- **Real NBA player/team snapshot as default league data.**
- Build-time import pipeline for NBA stats → ratings/tendencies.
- New league flow with real team selection.
- Local save/load.
- Roster page showing real player names.
- Player ratings/tendencies derived from real stats.
- Basic lineup page.
- Possession or simplified possession sim.
- Box score generation.
- Schedule.
- Standings.
- Playoffs.
- Champion history.
- Export/import save.

#### Should have

- Fictional league alternate snapshot.
- Contract values approximated from real salaries.
- `npm run data:build` script to refresh NBA snapshot.
- Injuries.
- Fatigue.
- Basic trades.
- Basic contracts.
- Basic free agency.
- Basic draft.
- News events.

#### Could have

- Morale.
- Chemistry.
- Awards.
- Scouting uncertainty.
- Trade finder.
- Advanced contracts.
- Play-by-play.
- Charts.
- Web Worker simulation.

#### Not MVP

- Multiplayer.
- Live runtime data pulls (all NBA data is build-time static).
- Official NBA logos and trademarks (unless licensed).
- 2D gameplay.
- Online accounts.
- Cloud saves.
- Real-time live games.

---

## 28. Milestone Plan

### Milestone 0 — Project Setup

**Goal:** Create working static app shell.

Tasks:

- Initialize Vite React TypeScript app.
- Install Tailwind.
- Install shadcn/ui.
- Install Zustand.
- Install Dexie.
- Install Recharts.
- Install Vitest.
- Configure ESLint/Prettier.
- Configure GitHub Pages build.
- Add app layout and routing.

Acceptance criteria:

- App runs locally.
- App builds.
- App deploys to GitHub Pages.
- Basic navigation works.

---

### Milestone 1 — Real NBA Static Data and Models

**Goal:** Import real NBA teams/players at build time and load them from static JSON.

Tasks:

- Define TypeScript models (include `externalId`, `importMeta` on players).
- Implement `importNBARosters.ts` and `importNBAStats.ts` build scripts.
- Import all 30 NBA teams with real names and divisions.
- Import ~450 real NBA players with bios (name, age, height, weight, position).
- Run `generateRatings.ts` / `generateTendencies.ts` from real season stats.
- Build `nba-2025-26` snapshot JSON files.
- Add data manifest with NBA snapshot as default.
- Implement `loadStaticData`.
- Validate: star players rate higher than bench players; team rosters match real assignments.
- Add optional `fictional-base` snapshot for alternate mode.

Acceptance criteria:

- App loads real NBA teams and players by default.
- User can see recognizable names (e.g. Jokic, Curry, Giannis) on rosters.
- Ratings correlate believably with real performance (stars > role players).
- No invalid player/team IDs.
- Every team has legal roster size.
- Ratings are within 0-100.
- `npm run data:build` regenerates snapshot without manual JSON editing.

---

### Milestone 2 — New League and Save System

**Goal:** User can start, save, load, export, and import a league.

Tasks:

- Build New League page.
- Build team selection.
- Copy static data into save state.
- Implement Dexie database.
- Implement save repository.
- Implement auto-save.
- Implement load game page.
- Implement export/import.

Acceptance criteria:

- New game creates a save.
- User can close browser and reload save.
- Export/import roundtrip works.
- Invalid imports are rejected.

---

### Milestone 3 — Roster and Player UI

**Goal:** User can view team roster and player details.

Tasks:

- Build roster table.
- Build player profile page.
- Show ratings.
- Show tendencies.
- Show contract.
- Show health/morale placeholders.
- Add sorting/filtering.

Acceptance criteria:

- User can view every player on team.
- User can open player profile.
- Ratings are readable.
- Table sorting works.

---

### Milestone 4 — Lineups and Rotations

**Goal:** User can set starters, bench, and minutes.

Tasks:

- Build lineup page.
- Implement rotation data model.
- Validate target minutes.
- Auto-generate rotation.
- Set closing lineup.
- Store lineup in save.

Acceptance criteria:

- User can set legal rotation.
- Invalid rotations show warnings.
- Auto rotation produces valid lineup.
- Rotation persists after reload.

---

### Milestone 5 — Game Simulation MVP

**Goal:** Simulate one game and produce box score.

Tasks:

- Implement seeded RNG.
- Implement basic possession engine.
- Implement shot selection.
- Implement make/miss model.
- Implement turnovers.
- Implement fouls/free throws.
- Implement rebounds.
- Implement substitution/minutes approximation.
- Build box score.
- Build game result.

Acceptance criteria:

- User can sim one game.
- Box score totals are internally consistent.
- Minutes roughly match rotation.
- Team score equals player points.
- Game result updates schedule.

---

### Milestone 6 — Schedule and Standings

**Goal:** Simulate through regular season.

Tasks:

- Generate season schedule.
- Build schedule page.
- Implement standings engine.
- Add sim next game.
- Add sim day/week/season.
- Add dashboard summary.

Acceptance criteria:

- Every team has correct number of games.
- Standings update correctly.
- Full season sim completes.
- No duplicate impossible games.
- Dashboard shows next game and record.

---

### Milestone 7 — Playoffs

**Goal:** Complete season with playoffs and champion.

Tasks:

- Generate playoff bracket.
- Sim playoff series.
- Add playoff page.
- Track series results.
- Crown champion.
- Store history.

Acceptance criteria:

- Top teams qualify.
- Bracket works.
- Series resolve correctly.
- Champion stored.
- Offseason phase begins.

---

### Milestone 8 — Trades and Contracts

**Goal:** Add basic roster management.

Tasks:

- Add contract model.
- Add payroll page.
- Build trade center.
- Implement trade legality.
- Implement trade value.
- Implement AI accept/reject.
- Add trade news event.

Acceptance criteria:

- User can propose trades.
- AI rejects bad trades.
- Accepted trades update rosters.
- Payroll updates.
- Trade persists after reload.

---

### Milestone 9 — Offseason, Draft, and Free Agency

**Goal:** Multi-season dynasty loop.

Tasks:

- Generate draft class.
- Build draft page.
- Implement draft order.
- Implement draft picks.
- Add rookie contracts.
- Build free agency page.
- Implement offers and signings.
- Progress to next season.
- Generate new schedule.

Acceptance criteria:

- User can complete offseason.
- New rookies enter league.
- Free agents sign.
- New season starts.
- League can run multiple seasons.

---

### Milestone 10 — Realism Expansion

**Goal:** Make sim and league feel alive.

Tasks:

- Add fatigue.
- Add injuries.
- Add morale.
- Add chemistry.
- Add team strategy.
- Add awards.
- Add news feed.
- Add player development.
- Add AI team direction.

Acceptance criteria:

- Injuries affect rotations.
- Young players develop.
- Veterans decline.
- Strategies affect box scores.
- Awards are generated.
- News feed reflects major events.

---

### Milestone 11 — Polish and Calibration

**Goal:** Balance and polish the game.

Tasks:

- Run simulation test suites.
- Tune possession model.
- Tune ratings.
- Tune trade AI.
- Tune development.
- Add charts.
- Improve mobile layout.
- Add help/tutorial.
- Add loading/progress states.
- Add accessibility improvements.

Acceptance criteria:

- Simulated league stats look believable.
- UI is understandable.
- Full multi-season sim works.
- User can recover from mistakes.
- No major data corruption bugs.

---

## 29. Feature Complete Backlog

### 29.1 Simulation

- Possession sim.
- Lineup-aware sim.
- Play-by-play generation.
- Shot zones.
- Advanced fouls.
- Clutch logic.
- Fatigue.
- Injuries.
- Home-court advantage.
- Strategy effects.
- Blowout bench logic.
- Playoff intensity.

### 29.2 Front office

- Trades.
- Trade finder.
- Draft picks.
- Pick protections.
- Contracts.
- Extensions.
- Free agency.
- Restricted free agency.
- Salary cap.
- Luxury tax.
- Team options/player options.
- Bad contract logic.
- AI team goals.

### 29.3 Player systems

- Development.
- Aging.
- Morale.
- Chemistry.
- Traits.
- Badges/archetypes.
- Injury history.
- Scouting uncertainty.
- Training focus.
- Role expectations.

### 29.4 League systems

- Schedule.
- Standings.
- Playoffs.
- Awards.
- Records.
- News.
- Rivalries.
- League history.
- Expansion teams.
- Rule changes.
- Hall of fame.

### 29.5 User experience

- Dashboard.
- Roster.
- Player page.
- Lineups.
- Schedule.
- Box score.
- Trade center.
- Free agency.
- Draft.
- Standings.
- Awards.
- News.
- Settings.
- Save import/export.
- Tutorial.
- Tooltips.
- Charts.
- Mobile support.

---

## 30. Risk Register

### 30.1 Risk: Simulation feels random

Mitigation:

- Use ratings and tendencies separately.
- Validate with thousands of simulated games.
- Add deterministic seeded RNG for repeatable tests.
- Tune distributions.

### 30.2 Risk: Game data is too large for static loading

Mitigation:

- Start with compact JSON.
- Split data files.
- Lazy load historical stats.
- Avoid storing full play-by-play by default.
- Consider compressed JSON or browser SQLite later.

### 30.3 Risk: Save corruption

Mitigation:

- Version saves.
- Validate imports.
- Add backup save slot.
- Auto-save only after valid state changes.
- Export feature.

### 30.4 Risk: GitHub Pages routing issues

Mitigation:

- Use HashRouter.
- Or configure fallback handling if using BrowserRouter.
- Test refresh on deep routes.

### 30.5 Risk: Legal/IP issues (real player names)

Mitigation:

- **Real player and team names are intentional** for this project; do not replace them with fictional names in the default snapshot.
- Do **not** ship official NBA logos, wordmarks, or copyrighted artwork unless licensed.
- Use team colors and abbreviations instead of logo assets in MVP.
- Omit player headshots unless sourced with clear usage rights.
- Add an in-app disclaimer: fan project, not affiliated with the NBA; names used for identification/simulation purposes.
- Keep all data as static build-time snapshots (no scraping at runtime).
- Provide fictional alternate snapshot for restricted distribution if needed.
- Document data sources in `README.md` and `importMeta` fields.

### 30.6 Risk: Scope creep

Mitigation:

- Build MVP first.
- Keep 2D gameplay out of MVP.
- Keep multiplayer out of MVP.
- Keep live data out of MVP.
- Treat each system as a milestone.

---

## 31. Definition of Done

A feature is done when:

- It has a clear data model.
- It has user-visible UI if applicable.
- It updates save state correctly.
- It survives save/load.
- It has validation.
- It has tests if it affects sim/game logic.
- It has acceptance criteria met.
- It does not break full-season simulation.
- It does not introduce impossible league state.

---

## 32. Recommended Development Order

Build in this exact order:

```txt
1. Static app shell
2. NBA data import pipeline (build time)
3. Static data loading (real NBA snapshot)
4. New league creation
5. Save/load/export/import
6. Roster/player UI (real names)
7. Lineup/rotation UI
8. Single-game sim
9. Box score
10. Schedule/standings
11. Full season sim
12. Playoffs
13. Contracts/trades
14. Draft/free agency
15. Development/injuries/fatigue
16. Morale/chemistry/news/awards
17. Calibration/polish
```

Do not build trades, draft, or free agency before the game can already simulate a season. The season simulation is the spine of the game.

---

## 33. Initial Issue Breakdown

### Epic A — App Foundation

- A1: Initialize Vite React TypeScript project.
- A2: Add Tailwind and shadcn/ui.
- A3: Add routing.
- A4: Add layout shell.
- A5: Add GitHub Pages deployment.
- A6: Add test setup.

### Epic B — Data Foundation (Real NBA)

- B1: Define domain models (including `externalId`, `importMeta`).
- B2: Implement `importNBARosters.ts` and `importNBAStats.ts`.
- B3: Build real NBA player snapshot (~450 players).
- B4: Build real NBA team snapshot (30 teams).
- B5: Implement data loader and manifest (NBA default).
- B6: Implement data validation (ratings vs. real stat sanity checks).
- B7: Add `npm run data:build` pipeline.
- B8: Add optional fictional alternate snapshot.

### Epic C — Saves

- C1: Configure Dexie.
- C2: Create save repository.
- C3: Implement new save.
- C4: Implement load save.
- C5: Implement auto-save.
- C6: Implement export/import.
- C7: Implement save validation.

### Epic D — Team Management UI

- D1: Dashboard page.
- D2: Roster page.
- D3: Player profile page.
- D4: Lineup page.
- D5: Rotation validator.
- D6: Auto rotation generator.

### Epic E — Simulation

- E1: Seeded RNG.
- E2: Game state model.
- E3: Possession loop.
- E4: Shot model.
- E5: Turnover model.
- E6: Foul model.
- E7: Rebound model.
- E8: Box score builder.
- E9: Sim one game action.
- E10: Simulation tests.

### Epic F — League Season

- F1: Schedule generator.
- F2: Standings engine.
- F3: Schedule page.
- F4: Sim day/week/season.
- F5: Playoff generator.
- F6: Playoff sim.
- F7: Champion history.

### Epic G — Dynasty Systems

- G1: Contract model.
- G2: Trade center.
- G3: Trade AI.
- G4: Free agency.
- G5: Draft generation.
- G6: Draft page.
- G7: Offseason engine.
- G8: Player development.

### Epic H — Realism and Polish

- H1: Fatigue.
- H2: Injuries.
- H3: Strategy settings.
- H4: Morale.
- H5: Chemistry.
- H6: News feed.
- H7: Awards.
- H8: Charts.
- H9: Calibration.
- H10: Tutorial/help.

---

## 34. Prompt for AI Coding Agents

Use this prompt when asking a coding agent to implement the project:

```txt
You are building CourtForge GM, a static GitHub Pages basketball franchise manager game.

Follow the spec in COURTFORGE_IMPLEMENTATION_PLAN.md exactly.

Hard constraints:
- React + TypeScript + Vite.
- Static GitHub Pages deployment.
- No runtime backend.
- No private API keys.
- No live API calls for core gameplay.
- Default league uses REAL NBA players and teams from static JSON in public/data/nba/.
- NBA data is imported at build time via scripts/; never fetched live in the browser.
- Use Dexie/IndexedDB for local saves.
- Use Zustand for app/game state.
- Keep game logic outside React components.
- Make simulation functions testable.
- Use seeded RNG for deterministic simulation tests.
- Build spec-first and milestone-first.

Development order:
1. App shell.
2. NBA data import pipeline (npm run data:build).
3. Static data models/loading (real NBA snapshot default).
4. New league + save/load/export/import.
5. Roster and player UI (real player names).
6. Lineup/rotation UI.
7. Single-game simulation.
8. Schedule/standings/season sim.
9. Playoffs.
10. Trades/contracts.
11. Draft/free agency.
12. Fatigue/injuries/development/morale/news/awards.
13. Calibration/polish.

Before coding any feature:
- Read the relevant spec section.
- Identify required data model changes.
- Add or update tests for game logic.
- Implement pure logic first.
- Add UI second.
- Verify save/load still works.
- Verify full-season sim does not crash.

Use real NBA player and team names in the default snapshot. Do not ship official NBA logos or trademarks. Add a non-affiliation disclaimer in the app.
```

---

## 35. Final Recommendation

Build the game around the simulation spine first:

```txt
Real NBA data import → Static snapshot → New league → Save → Roster → Rotation → Sim game → Box score → Standings → Season → Playoffs
```

Once that loop is fun, add the dynasty systems:

```txt
Contracts → Trades → Draft → Free agency → Development → Injuries → Morale → News → Awards
```

The strongest version of CourtForge GM will come from managing **real NBA rosters** with a realistic possession-based simulation, stat-derived player ratings, believable player development, and a league that diverges from real history based on the user's front-office decisions.
