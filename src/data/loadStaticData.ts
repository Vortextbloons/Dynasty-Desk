import type {
  AwardsFile,
  DataManifest,
  PlayerSeasonStats,
  StaticPlayer,
  StaticSnapshot,
  StaticTeam,
} from '@/game/models'
import type { ChampionsFile } from '@/game/models/champion'
import { computeCareerStats } from '@/game/models/playerCareerStats'
import { getEraConfig } from '@/game/models/eraConfig'
import { getLeagueRules } from '@/game/models/leagueRules'

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

function joinBaseUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}` || normalizedPath
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
  const baseUrl = options.baseUrl ?? import.meta.env.BASE_URL ?? ''
  const fetcher = options.fetcher ?? defaultFetch

  return {
    async loadManifest() {
      return fetchJson<DataManifest>(
        joinBaseUrl(baseUrl, '/data/manifest.json'),
        fetcher,
      )
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
          fetchJson<StaticTeam[]>(
            joinBaseUrl(baseUrl, `${base}/teams.json`),
            fetcher,
          ),
          fetchJson<StaticPlayer[]>(
            joinBaseUrl(baseUrl, `${base}/roster.json`),
            fetcher,
          ),
          fetchJson<PlayerSeasonStats[]>(
            joinBaseUrl(baseUrl, `${base}/season-stats.json`),
            fetcher,
          ),
          fetchJson<AwardsFile>(
            joinBaseUrl(baseUrl, '/data/shared/awards-history.json'),
            fetcher,
          ).catch((): AwardsFile => ({ version: '0', updatedAt: '', awards: [] })),
          fetchJson<ChampionsFile>(
            joinBaseUrl(baseUrl, '/data/shared/champions.json'),
            fetcher,
          ).catch((): ChampionsFile => ({ version: '0', updatedAt: '', champions: [] })),
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
