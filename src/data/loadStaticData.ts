import type {
  AwardWinner,
  Champion,
  DataManifest,
  PlayerSeasonStats,
  StaticPlayer,
  StaticSnapshot,
  StaticTeam,
} from '@/game/models'
import { computeCareerStats } from '@/game/models/playerCareerStats'
import { getEraConfig } from '@/game/models/eraConfig'
import { getLeagueRules } from '@/game/models/leagueRules'

interface AwardsFile {
  version: string
  updatedAt: string
  awards: AwardWinner[]
}

interface ChampionsFile {
  version: string
  updatedAt: string
  champions: Champion[]
}

export interface StaticDataLoader {
  loadManifest(): Promise<DataManifest>
  loadSnapshot(id: string): Promise<StaticSnapshot>
  listSnapshots(): Promise<DataManifest['snapshots']>
}

type FetchLike = (
  input: string,
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

function defaultFetch(input: string): ReturnType<FetchLike> {
  return fetch(input)
}

async function fetchJson<T>(
  url: string,
  fetcher: FetchLike = defaultFetch,
): Promise<T> {
  const res = await fetcher(url)
  if (!res.ok) {
    throw new Error(`Failed to load ${url}: ${res.status}`)
  }
  return (await res.json()) as T
}

export function createStaticDataLoader(
  options: {
    baseUrl?: string
    fetcher?: FetchLike
  } = {},
): StaticDataLoader {
  const baseUrl = options.baseUrl ?? ''
  const fetcher = options.fetcher ?? defaultFetch

  return {
    async loadManifest() {
      return fetchJson<DataManifest>(`${baseUrl}/data/manifest.json`, fetcher)
    },
    async loadSnapshot(id) {
      const manifest = await this.loadManifest()
      const entry = manifest.snapshots.find((s) => s.id === id)
      if (!entry) {
        throw new Error(`Snapshot not found: ${id}`)
      }
      const base = entry.basePath
      const [teams, players, seasonStats, awardsFile, championsFile] =
        await Promise.all([
          fetchJson<StaticTeam[]>(`${baseUrl}${base}/teams.json`, fetcher),
          fetchJson<StaticPlayer[]>(`${baseUrl}${base}/roster.json`, fetcher),
          fetchJson<PlayerSeasonStats[]>(
            `${baseUrl}${base}/season-stats.json`,
            fetcher,
          ),
          fetchJson<AwardsFile>(
            `${baseUrl}/data/shared/awards-history.json`,
            fetcher,
          ).catch(() => ({ version: '0', updatedAt: '', awards: [] } as AwardsFile)),
          fetchJson<ChampionsFile>(
            `${baseUrl}/data/shared/champions.json`,
            fetcher,
          ).catch(() => ({ version: '0', updatedAt: '', champions: [] } as ChampionsFile)),
        ])

      const awards = awardsFile.awards ?? []
      const champions = championsFile.champions ?? []

      const filteredAwards = awards.filter(
        (a) => a.season === entry.seasonLabel,
      )
      const filteredChampions = champions.filter(
        (c) => c.season === entry.seasonLabel,
      )

      const eraConfig = getEraConfig(entry.seasonLabel)
      const rules = getLeagueRules(entry.seasonLabel)

      const playerExternalToId = new Map<string, string>()
      for (const p of players) {
        if (p.externalId) playerExternalToId.set(p.externalId, p.id)
      }

      const seasonStatsByPlayer = new Map<string, PlayerSeasonStats[]>()
      for (const s of seasonStats) {
        const rawId =
          (s as unknown as { playerId?: string; playerExternalId?: string })
            .playerId ??
          (s as unknown as { playerExternalId?: string }).playerExternalId ??
          ''
        const id = playerExternalToId.get(rawId) ?? rawId
        const normalized: PlayerSeasonStats = { ...s, playerId: id }
        const arr = seasonStatsByPlayer.get(id) ?? []
        arr.push(normalized)
        seasonStatsByPlayer.set(id, arr)
      }
      const careerStats = Array.from(seasonStatsByPlayer.entries()).map(
        ([playerId, seasons]) => computeCareerStats(playerId, seasons),
      )

      return {
        id: entry.id,
        name: entry.name,
        type: entry.type,
        seasonLabel: entry.seasonLabel,
        startYear: entry.startYear,
        teams,
        players,
        seasonStats,
        careerStats,
        eraConfig,
        rules,
        awards: filteredAwards,
        champions: filteredChampions,
      }
    },
    async listSnapshots() {
      const manifest = await this.loadManifest()
      return manifest.snapshots
    },
  }
}

export const staticDataLoader = createStaticDataLoader()
