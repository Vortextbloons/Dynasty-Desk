#!/usr/bin/env npx tsx
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { OVERALL_WEIGHTS, computeOverall, computeRealOverall } from '../src/game/ratings/overallWeights'
import type { Position } from '../src/game/models/position'
import type { PlayerRatings } from '../src/game/models/ratings'
import type { PlayerSeasonStats } from '../src/game/models/playerSeasonStats'

const DATA_DIR = join(import.meta.dirname, '..', 'public', 'data', 'nba')

interface SnapshotEntry {
  id: string
  seasonLabel: string
  basePath: string
  [key: string]: unknown
}

interface DataManifest {
  snapshots: SnapshotEntry[]
  [key: string]: unknown
}

interface StaticPlayer {
  id: string
  externalId?: string
  firstName: string
  lastName: string
  position: Position
  ratings: Record<string, number>
  [key: string]: unknown
}

function deriveOverallForSnapshot(snapshotDir: string): number {
  const rosterPath = join(snapshotDir, 'roster.json')
  const statsPath = join(snapshotDir, 'season-stats.json')
  if (!existsSync(rosterPath)) return 0

  const players = JSON.parse(readFileSync(rosterPath, 'utf-8')) as StaticPlayer[]

  let statsByExternalId: Record<string, PlayerSeasonStats> = {}
  if (existsSync(statsPath)) {
    const statsList = JSON.parse(readFileSync(statsPath, 'utf-8')) as PlayerSeasonStats[]
    for (const s of statsList) {
      if (s.playerId) statsByExternalId[s.playerId] = s
    }
  }

  let updated = 0

  for (const player of players) {
    const position = player.position
    if (!(position in OVERALL_WEIGHTS)) continue

    const stats = player.externalId ? statsByExternalId[player.externalId] : undefined
    const overall = stats
      ? computeRealOverall(player.ratings as PlayerRatings, position, stats)
      : computeOverall(player.ratings as PlayerRatings, position)
    player.ratings.overall = overall
    updated++
  }

  writeFileSync(rosterPath, JSON.stringify(players, null, 2))
  return updated
}

function main() {
  const manifestPath = join(DATA_DIR, '..', 'manifest.json')
  if (!existsSync(manifestPath)) {
    console.error('manifest.json not found. Run Go generator first.')
    process.exit(1)
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as DataManifest
  const snapshots = manifest.snapshots ?? []

  let totalPlayers = 0
  let totalSnapshots = 0

  for (const snapshot of snapshots) {
    const snapshotDir = join(DATA_DIR, snapshot.basePath.replace('/data/nba/', ''))
    if (!existsSync(snapshotDir)) continue

    const count = deriveOverallForSnapshot(snapshotDir)
    if (count > 0) {
      totalPlayers += count
      totalSnapshots++
      console.log(`  ${snapshot.seasonLabel}: ${count} players`)
    }
  }

  console.log(`\nDerived overall for ${totalPlayers} players across ${totalSnapshots} snapshots`)
}

main()
