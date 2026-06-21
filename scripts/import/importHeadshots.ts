#!/usr/bin/env npx tsx
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DATA_DIR = join(import.meta.dirname, '..', '..', 'public', 'data', 'nba')
const HEADSHOT_DIR = join(DATA_DIR, 'headshots')
const CACHE_DIR = join(import.meta.dirname, '..', '..', '.headshot-cache')
const MANIFEST_PATH = join(HEADSHOT_DIR, 'manifest.json')
const HEADSHOT_BASE_URL = 'https://cdn.nba.com/headshots/nba/latest/1040x760'

interface StaticPlayer {
  id: string
  externalId?: string
  firstName: string
  lastName: string
  [key: string]: unknown
}

interface ManifestEntry {
  id: string
  seasonLabel: string
  basePath: string
  [key: string]: unknown
}

interface DataManifest {
  snapshots: ManifestEntry[]
  [key: string]: unknown
}

interface Manifest {
  updatedAt: string
  succeeded: string[]
  failed: string[]
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function downloadWithRetry(
  url: string,
  retries = 3,
  baseDelayMs = 1000,
): Promise<Buffer | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url)
      if (res.status === 404) return null
      if (!res.ok) {
        if (attempt < retries - 1) {
          await sleep(baseDelayMs * Math.pow(2, attempt))
          continue
        }
        return null
      }
      return Buffer.from(await res.arrayBuffer())
    } catch {
      if (attempt < retries - 1) {
        await sleep(baseDelayMs * Math.pow(2, attempt))
        continue
      }
      return null
    }
  }
  return null
}

async function main() {
  mkdirSync(HEADSHOT_DIR, { recursive: true })
  mkdirSync(CACHE_DIR, { recursive: true })

  const manifestPath = join(DATA_DIR, '..', 'manifest.json')
  if (!existsSync(manifestPath)) {
    console.error('manifest.json not found. Run Go generator first.')
    process.exit(1)
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as DataManifest
  const snapshots = manifest.snapshots ?? []

  const allExternalIds = new Set<string>()
  for (const snapshot of snapshots) {
    const rosterPath = join(DATA_DIR, snapshot.basePath.replace('/data/nba/', ''), 'roster.json')
    if (!existsSync(rosterPath)) continue
    const players = JSON.parse(readFileSync(rosterPath, 'utf-8')) as StaticPlayer[]
    for (const p of players) {
      if (p.externalId) allExternalIds.add(p.externalId)
    }
  }

  console.log(`Found ${allExternalIds.size} unique players with externalIds`)

  const succeeded: string[] = []
  const failed: string[] = []
  let downloaded = 0
  let cached = 0

  for (const externalId of allExternalIds) {
    const outPath = join(HEADSHOT_DIR, `${externalId}.png`)
    const cachePath = join(CACHE_DIR, `${externalId}.png`)

    if (existsSync(outPath)) {
      cached++
      succeeded.push(externalId)
      continue
    }

    if (existsSync(cachePath)) {
      const { size } = statSync(cachePath)
      if (size > 0) {
        const data = readFileSync(cachePath)
        writeFileSync(outPath, data)
        cached++
        succeeded.push(externalId)
        continue
      }
    }

    const url = `${HEADSHOT_BASE_URL}/${externalId}.png`
    const data = await downloadWithRetry(url)

    if (data && data.length > 1000) {
      writeFileSync(outPath, data)
      writeFileSync(cachePath, data)
      downloaded++
      succeeded.push(externalId)
      if (downloaded % 50 === 0) {
        console.log(`  Downloaded ${downloaded} so far...`)
      }
    } else {
      failed.push(externalId)
    }
  }

  const outputManifest: Manifest = {
    updatedAt: new Date().toISOString(),
    succeeded,
    failed,
  }
  writeFileSync(MANIFEST_PATH, JSON.stringify(outputManifest, null, 2))

  const sizeKB = succeeded.length * 40
  console.log(`\nHeadshots: ${succeeded.length} succeeded, ${failed.length} failed`)
  console.log(`  Cached: ${cached}, Downloaded: ${downloaded}`)
  console.log(`  Estimated bundle size: ~${Math.round(sizeKB / 1024)} MB`)
}

main().catch(console.error)
