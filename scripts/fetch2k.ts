import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { TwoKTeamData } from '../src/game/management/calibration'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const CACHE_PATH = resolve(__dirname, '../public/data/shared/2k-classic-teams.json')
const BASE_URL = 'https://www.2kratings.com/teams'

// Classic teams we want to scrape per season
const SEASON_TEAM_MAP: Record<string, string[]> = {
  '2005-06': ['2005-06-miami-heat', '2005-06-memphis-grizzlies'],
  '2010-11': ['2010-11-chicago-bulls', '2010-11-dallas-mavericks'],
  '2012-13': ['2012-13-miami-heat', '2012-13-memphis-grizzlies'],
  '2013-14': ['2013-14-indiana-pacers', '2013-14-san-antonio-spurs', '2013-14-los-angeles-clippers'],
  '2015-16': ['2015-16-cleveland-cavaliers', '2015-16-golden-state-warriors'],
  '2016-17': ['2016-17-golden-state-warriors'],
  '2018-19': ['2018-19-toronto-raptors'],
}

function getArg(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag)
  return idx === -1 ? undefined : args[idx + 1]
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

// ---------------------------------------------------------------------------
// HTML parsing helpers
// ---------------------------------------------------------------------------

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
}

function extractTeamCategories(html: string): {
  ins: number; out: number; ath: number; pla: number; def: number; reb: number; int: number
} {
  const text = stripTags(html)
  // Pattern: "OVR 82 INS 67 OUT 76 ATH 81 PLA 62 DEF 71 REB 61 INT 77"
  const re = /OVR\s+(\d+)\s+INS\s+(\d+)\s+OUT\s+(\d+)\s+ATH\s+(\d+)\s+PLA\s+(\d+)\s+DEF\s+(\d+)\s+REB\s+(\d+)\s+INT\s+(\d+)/
  const m = text.match(re)
  if (!m) return { ins: 0, out: 0, ath: 0, pla: 0, def: 0, reb: 0, int: 0 }
  const g = (i: number) => parseInt(m![i] ?? '0', 10) || 0
  return {
    ins: g(2), out: g(3), ath: g(4),
    pla: g(5), def: g(6), reb: g(7), int: g(8),
  }
}

function extractPlayers(html: string): Array<{
  name: string; position: string; overall: number; threePoint: number; dunk: number
}> {
  const text = stripTags(html)
  const players: Array<{
    name: string; position: string; overall: number; threePoint: number; dunk: number
  }> = []

  // The player table rows in the text look like:
  // "1.      25    Dwyane Wade      PG / SG | 6'4\"  | 2-Way PlaySlash Bully   95 79 95"
  // or: "1.      12    Dirk Nowitzki      PF / C | 7'1\"  | Crafty 3-Level Board Enforcer   96 90 50"
  //
  // Key: after the archetype description, there are 3 numbers: OVR 3PT DNK
  // The numbers are always 2-3 digits each, separated by spaces

  // Split into lines and look for player rows
  const lines = text.split('\n')

  for (const line of lines) {
    // Match: rank. jersey Name Position(s) | height | archetype OVR 3PT DNK
    const m = line.match(
      /(\d+)\.\s+(\d+)\s+(.+?)\s+(PG|SG|SF|PF|C)(?:\s*\/\s*(?:PG|SG|SF|PF|C))?\s*\|[^|]*\|[^|]*?(\d{2,3})\s+(\d{2,3})\s+(\d{2,3})/,
    )
    if (m) {
      const name = (m[3] ?? '').trim()
      const position = m[4] ?? 'SF'
      const overall = parseInt(m[5] ?? '0', 10)
      const threePoint = parseInt(m[6] ?? '0', 10)
      const dunk = parseInt(m[7] ?? '0', 10)
      if (name && overall >= 60 && overall <= 99) {
        players.push({ name, position, overall, threePoint, dunk })
      }
    }
  }

  // Fallback: try matching without the pipe-delimited section
  if (players.length === 0) {
    // Look for patterns like: "Dirk Nowitzki PF / C 96 90 50"
    const fallback = /(\d+)\.\s+\d+\s+([\w\s.'-]+?)\s+(PG|SG|SF|PF|C)(?:\s*\/\s*(?:PG|SG|SF|PF|C))?\s+(?:.*?(\d{2,3})\s+(\d{2,3})\s+(\d{2,3}))?/g
    let match
    while ((match = fallback.exec(text)) !== null) {
      const name = (match[2] ?? '').trim()
      const position = match[3] ?? 'SF'
      const overall = match[4] ? parseInt(match[4], 10) : 0
      const threePoint = match[5] ? parseInt(match[5], 10) : 0
      const dunk = match[6] ? parseInt(match[6], 10) : 0
      if (name && overall >= 60 && overall <= 99 && !players.some((p) => p.name === name)) {
        players.push({ name, position, overall, threePoint, dunk })
      }
    }
  }

  return players
}

// ---------------------------------------------------------------------------
// Scraper
// ---------------------------------------------------------------------------

async function scrapeTeamPage(slug: string, season: string): Promise<TwoKTeamData | null> {
  const url = `${BASE_URL}/${slug}`
  console.error(`  Fetching ${url}...`)

  try {
    const html = await fetchPage(url)

    const teamName = slug
      .replace(/^\d{4}-\d{2}-/, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())

    const cats = extractTeamCategories(html)
    const teamOvr = cats.ins > 0
      ? Math.round((cats.ins + cats.out + cats.ath + cats.pla + cats.def + cats.reb) / 6)
      : 0

    const players = extractPlayers(html)

    if (players.length === 0) {
      console.error(`  WARNING: No players parsed for ${slug}`)
      return null
    }

    console.error(`  Parsed ${players.length} players`)

    return {
      season,
      teamName,
      teamOvr,
      teamIns: cats.ins,
      teamOut: cats.out,
      teamAth: cats.ath,
      teamPla: cats.pla,
      teamDef: cats.def,
      teamReb: cats.reb,
      teamInt: cats.int,
      players,
    }
  } catch (err) {
    console.error(`  ERROR: ${err}`)
    return null
  }
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

function loadCache(): TwoKTeamData[] {
  try {
    if (existsSync(CACHE_PATH)) {
      return JSON.parse(readFileSync(CACHE_PATH, 'utf-8'))
    }
  } catch { /* ignore */ }
  return []
}

function saveCache(data: TwoKTeamData[]): void {
  const dir = dirname(CACHE_PATH)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2))
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2)
  const seasonsArg = getArg(args, '--seasons')
  const force = args.includes('--force')

  const seasons = seasonsArg
    ? seasonsArg.split(',').map((s) => s.trim())
    : Object.keys(SEASON_TEAM_MAP)

  const existing = loadCache()
  const existingKeys = new Set(existing.map((t) => `${t.season}|${t.teamName}`))

  for (const season of seasons) {
    const slugs = SEASON_TEAM_MAP[season]
    if (!slugs || slugs.length === 0) {
      console.error(`No classic teams for ${season} (current season — use roster.json directly)`)
      continue
    }

    console.error(`\nSeason: ${season}`)

    for (const slug of slugs) {
      const teamName = slug
        .replace(/^\d{4}-\d{2}-/, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())

      if (!force && existingKeys.has(`${season}|${teamName}`)) {
        console.error(`  Skipping ${teamName} (cached)`)
        continue
      }

      // Remove old entry if force
      if (force) {
        const idx = existing.findIndex((t) => t.season === season && t.teamName === teamName)
        if (idx >= 0) existing.splice(idx, 1)
      }

      const data = await scrapeTeamPage(slug, season)
      if (data) {
        existing.push(data)
        existingKeys.add(`${season}|${data.teamName}`)
        saveCache(existing)
      }

      await sleep(2000)
    }
  }

  saveCache(existing)
  console.error(`\nDone. ${existing.length} teams cached.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
