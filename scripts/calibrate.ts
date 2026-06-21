import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { StaticSnapshot, StaticPlayer, StaticTeam } from '../src/game/models/static'
import type { PlayerSeasonStats } from '../src/game/models/playerSeasonStats'
import type { TwoKTeamData } from '../src/game/management/calibration'
import { runCalibrationSuite } from '../src/game/management/calibration'
import { getEraConfig } from '../src/game/models/eraConfig'
import { getLeagueRules } from '../src/game/models/leagueRules'
import { computeCareerStats } from '../src/game/models/playerCareerStats'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DATA_DIR = resolve(__dirname, '../public/data')

function getArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag)
  return idx === -1 ? undefined : args[idx + 1]
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag)
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T
}

function loadSnapshotDirect(season: string): StaticSnapshot | null {
  try {
    const base = `${DATA_DIR}/nba/${season}`
    const manifest = loadJson<{ snapshots: Array<{ id: string; seasonLabel: string; startYear: number }> }>(`${DATA_DIR}/manifest.json`)
    const entry = manifest.snapshots.find((s) => s.seasonLabel === season)
    if (!entry) return null

    const teams = loadJson<StaticTeam[]>(`${base}/teams.json`)
    const players = loadJson<StaticPlayer[]>(`${base}/roster.json`)
    const seasonStatsRaw = loadJson<PlayerSeasonStats[]>(`${base}/season-stats.json`)

    const externalToId = new Map<string, string>()
    for (const p of players) {
      if (p.externalId) externalToId.set(p.externalId, p.id)
    }

    const statsByPlayer = new Map<string, PlayerSeasonStats[]>()
    for (const s of seasonStatsRaw) {
      const raw = (s as unknown as { playerId?: string; playerExternalId?: string }).playerId
        ?? (s as unknown as { playerExternalId?: string }).playerExternalId
        ?? ''
      const id = externalToId.get(raw) ?? raw
      const normalized = { ...s, playerId: id }
      const arr = statsByPlayer.get(id) ?? []
      arr.push(normalized)
      statsByPlayer.set(id, arr)
    }

    const careerStats = Array.from(statsByPlayer.entries()).map(
      ([playerId, seasons]) => computeCareerStats(playerId, seasons),
    )

    const eraConfig = getEraConfig(season)
    const rules = getLeagueRules(season)

    return {
      id: entry.id,
      name: `NBA ${season}`,
      type: 'nba',
      seasonLabel: season,
      startYear: entry.startYear,
      teams,
      players,
      seasonStats: seasonStatsRaw,
      careerStats,
      eraConfig,
      rules,
      awards: [],
      champions: [],
    }
  } catch (err) {
    console.error(`Error loading ${season}: ${err}`)
    return null
  }
}

function load2KCache(season: string): TwoKTeamData[] | undefined {
  try {
    const raw = readFileSync(
      resolve(DATA_DIR, 'shared/2k-classic-teams.json'),
      'utf-8',
    )
    const all: TwoKTeamData[] = JSON.parse(raw)
    return all.filter((t) => t.season === season)
  } catch {
    return undefined
  }
}

async function main() {
  const args = process.argv.slice(2)
  const seasonsArg = getArg(args, '--seasons')
  const compare2K = hasFlag(args, '--compare-2k')

  const seasons = seasonsArg
    ? seasonsArg.split(',').map((s) => s.trim())
    : ['2025-26']

  const results: Record<string, unknown> = {}

  for (const season of seasons) {
    const snapshot = loadSnapshotDirect(season)
    if (!snapshot) {
      console.error(`Could not load snapshot for ${season}`)
      continue
    }

    const era = getEraConfig(season)
    const twoKData = compare2K ? load2KCache(season) : undefined

    if (compare2K && !twoKData) {
      console.error(
        `No 2K cache found for ${season}. Run: npx tsx scripts/fetch2k.ts --seasons ${season}`,
      )
    }

    const report = await runCalibrationSuite(snapshot, {
      eraConfig: era,
      twoKData: twoKData ?? undefined,
    })

    results[season] = report
    console.error(`Calibration complete for ${season}`)
  }

  console.log(JSON.stringify(results, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
