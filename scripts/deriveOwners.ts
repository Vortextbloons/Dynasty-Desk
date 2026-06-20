import type { OwnerProfile, OwnerPersonality } from '../src/game/models/owner'
import type { StaticTeam } from '../src/game/models/static'
import { OWNER_NAMES, OWNER_PERSONALITIES } from '../src/game/ownerNames'

function seededRandom(seed: string): () => number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
  }
}

export function deriveOwner(team: StaticTeam, index: number): OwnerProfile {
  const rand = seededRandom(team.id)

  const name = OWNER_NAMES[index % OWNER_NAMES.length]!

  let personality: OwnerPersonality
  if (team.prestige >= 85) {
    personality = rand() > 0.5 ? 'win_now' : 'spendthrift'
  } else if (team.prestige <= 60) {
    personality = rand() > 0.5 ? 'patient' : 'frugal'
  } else {
    personality = OWNER_PERSONALITIES[
      Math.floor(rand() * OWNER_PERSONALITIES.length)
    ] as OwnerPersonality
  }

  const netWorth = Math.round(15_000_000_000 + rand() * 10_000_000_000)
  const cash = Math.round(40_000_000 + rand() * 30_000_000)

  return {
    teamId: team.id,
    name,
    personality,
    netWorth,
    cash,
    softCashPressureSeasons: 0,
  }
}
