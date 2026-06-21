import type { LeagueState } from '@/game/models/league'
import type {
  DraftClass,
  DraftProspect,
  Draft,
  DraftPickResult,
} from '@/game/models/draft'
import type { LeagueRules } from '@/game/models/leagueRules'
import type { Position } from '@/game/models/position'
import type { Player } from '@/game/models/player'
import type { TeamDirection } from '@/game/models/team'
import type { PlayerRatings } from '@/game/models/ratings'
import { clampRating } from '@/game/models/ratings'
import { computeOverall } from '@/game/ratings/overallWeights'
import type { SeededRandom } from '@/game/sim/rng'
import {
  DRAFT_ARCHETYPES,
  buildRatingsFromArchetype,
  pickArchetypeForPosition,
} from '@/data/draftArchetypes'
import { pickRandomName } from '@/data/draftNamePools'
import { initScoutingForDraftClass } from './scoutingEngine'
import type { DraftPick } from '@/game/models/draft'

export const BASE_DRAFT_PROSPECTS = 60
export const FORFEITED_PROSPECT_ID = '__forfeited__'

export interface DraftOrderBoardEntry {
  pickNumber: number
  originalTeamId: string
  currentTeamId: string
  round: number
  traded: boolean
}

export interface UserDraftPickSlot {
  pickNumber: number
  round: number
  pickId: string
}
const POSITIONS: Position[] = ['PG', 'SG', 'SF', 'PF', 'C']
const RATING_KEYS: (keyof PlayerRatings)[] = [
  'insideScoring',
  'closeShot',
  'midrange',
  'threePoint',
  'freeThrow',
  'ballHandling',
  'passing',
  'offensiveIq',
  'offensiveRebound',
  'defensiveRebound',
  'perimeterDefense',
  'interiorDefense',
  'steal',
  'block',
  'defensiveIq',
  'speed',
  'strength',
  'vertical',
  'stamina',
  'durability',
  'clutch',
  'consistency',
]

type DraftClassProfileId = 'weak' | 'normal' | 'strong' | 'generational'
type ProspectTierId =
  | 'franchise'
  | 'all_star'
  | 'starter'
  | 'rotation'
  | 'second_round'
  | 'longshot'

interface DraftClassProfile {
  id: DraftClassProfileId
  topTalentBonus: number
  depthBonus: number
  tierCounts: Partial<Record<ProspectTierId, number>>
}

interface ProspectTier {
  id: ProspectTierId
  overallRange: [number, number]
  potentialRange: [number, number]
  bustRisk: [number, number]
  breakoutChance: [number, number]
}

const PROSPECT_TIERS: Record<ProspectTierId, ProspectTier> = {
  franchise: {
    id: 'franchise',
    overallRange: [77, 83],
    potentialRange: [92, 99],
    bustRisk: [0.05, 0.13],
    breakoutChance: [0.24, 0.38],
  },
  all_star: {
    id: 'all_star',
    overallRange: [72, 79],
    potentialRange: [86, 96],
    bustRisk: [0.08, 0.18],
    breakoutChance: [0.18, 0.3],
  },
  starter: {
    id: 'starter',
    overallRange: [66, 74],
    potentialRange: [78, 91],
    bustRisk: [0.12, 0.24],
    breakoutChance: [0.12, 0.24],
  },
  rotation: {
    id: 'rotation',
    overallRange: [60, 69],
    potentialRange: [72, 85],
    bustRisk: [0.16, 0.3],
    breakoutChance: [0.08, 0.18],
  },
  second_round: {
    id: 'second_round',
    overallRange: [55, 65],
    potentialRange: [66, 82],
    bustRisk: [0.22, 0.38],
    breakoutChance: [0.06, 0.18],
  },
  longshot: {
    id: 'longshot',
    overallRange: [50, 60],
    potentialRange: [60, 78],
    bustRisk: [0.3, 0.48],
    breakoutChance: [0.03, 0.13],
  },
}

const DRAFT_CLASS_PROFILES: DraftClassProfile[] = [
  {
    id: 'weak',
    topTalentBonus: -4,
    depthBonus: -3,
    tierCounts: { all_star: 1, starter: 5, rotation: 14, second_round: 22 },
  },
  {
    id: 'normal',
    topTalentBonus: 0,
    depthBonus: 0,
    tierCounts: { all_star: 3, starter: 9, rotation: 18, second_round: 20 },
  },
  {
    id: 'strong',
    topTalentBonus: 2,
    depthBonus: 2,
    tierCounts: { all_star: 4, starter: 12, rotation: 20, second_round: 16 },
  },
  {
    id: 'generational',
    topTalentBonus: 3,
    depthBonus: 1,
    tierCounts: {
      franchise: 1,
      all_star: 2,
      starter: 8,
      rotation: 18,
      second_round: 20,
    },
  },
]

interface RealProspectData {
  externalId?: string
  firstName: string
  lastName: string
  age: number
  position: Position
  secondaryPositions?: Position[]
  heightInches: number
  weightLbs: number
  archetype: string
  ratings?: Partial<PlayerRatings>
  potential?: number
  bustRisk?: number
  breakoutChance?: number
}

interface RealDraftClassesFile {
  classes: Record<string, { prospects: RealProspectData[] }>
}

export function formatSeasonLabel(startYear: number): string {
  const endYear = (startYear + 1) % 100
  return `${startYear}-${String(endYear).padStart(2, '0')}`
}

export function parseSeasonStartYear(season: string): number {
  const m = /^(\d{4})/.exec(season)
  return m ? Number(m[1]) : new Date().getFullYear()
}

export function isModernLotteryEra(seasonLabel: string): boolean {
  return parseSeasonStartYear(seasonLabel) >= 2019
}

/** NBA-style lottery odds (top 14 teams, top 4 randomized) */
const LOTTERY_ODDS: { rank: number; combinations: number }[] = [
  { rank: 1, combinations: 140 },
  { rank: 2, combinations: 140 },
  { rank: 3, combinations: 140 },
  { rank: 4, combinations: 125 },
  { rank: 5, combinations: 105 },
  { rank: 6, combinations: 90 },
  { rank: 7, combinations: 75 },
  { rank: 8, combinations: 60 },
  { rank: 9, combinations: 45 },
  { rank: 10, combinations: 30 },
  { rank: 11, combinations: 20 },
  { rank: 12, combinations: 15 },
  { rank: 13, combinations: 10 },
  { rank: 14, combinations: 5 },
]

export async function loadRealDraftData(
  seasonYear: number,
): Promise<RealProspectData[]> {
  try {
    const res = await fetch(
      `${import.meta.env.BASE_URL}data/draft/real-draft-classes.json`,
    )
    if (!res.ok) return []
    const data = (await res.json()) as RealDraftClassesFile
    return data.classes[String(seasonYear)]?.prospects ?? []
  } catch {
    return []
  }
}

export function generateDraftClass(
  seasonYear: number,
  _rules: LeagueRules,
  realData: RealProspectData[],
  rng: SeededRandom,
): DraftClass {
  const season = formatSeasonLabel(seasonYear)
  const classId = `draft-class-${seasonYear}`
  const profile = pickDraftClassProfile(rng)
  const syntheticPlan = buildSyntheticTierPlan(profile)
  const usedNames = new Set<string>()
  const prospects: DraftProspect[] = []

  for (const real of realData) {
    prospects.push(buildRealProspect(real, classId, rng))
    usedNames.add(`${real.firstName} ${real.lastName}`)
  }

  while (prospects.length < BASE_DRAFT_PROSPECTS) {
    const position = POSITIONS[prospects.length % POSITIONS.length]!
    const tier = syntheticPlan[prospects.length - realData.length] ?? 'longshot'
    prospects.push(
      buildSyntheticProspect(classId, position, tier, profile, usedNames, rng),
    )
  }

  return {
    id: classId,
    seasonYear,
    season,
    generatedAt: new Date().toISOString(),
    prospects,
    generatedBy: 'hybrid',
    realProspectCount: realData.length,
    syntheticProspectCount: BASE_DRAFT_PROSPECTS - realData.length,
  }
}

/** Placeholder class for offseason scouting; replaced when real JSON is available at draft. */
export function prepareDraftClass(
  league: LeagueState,
  seasonYear: number,
  rules: LeagueRules,
  realData: RealProspectData[],
  rng: SeededRandom,
): DraftClass {
  const existing = getDraftClassForYear(league, seasonYear)
  const shouldReplace =
    !existing || (existing.realProspectCount === 0 && realData.length > 0)

  if (!shouldReplace && existing) return existing

  const oldClassId = existing?.id
  const draftClass = generateDraftClass(seasonYear, rules, realData, rng)
  league.draftClasses[draftClass.id] = draftClass

  if (oldClassId && oldClassId !== draftClass.id) {
    delete league.draftClasses[oldClassId]
    for (const key of Object.keys(league.scoutingState)) {
      if (key.endsWith(`-${oldClassId}`)) {
        delete league.scoutingState[key]
      }
    }
  }

  initScoutingForDraftClass(league, draftClass.id)
  return draftClass
}

/** Pad the class so every draft slot (including comp picks) has a prospect. */
export function extendDraftClassToSlotCount(
  league: LeagueState,
  draftClass: DraftClass,
  seasonYear: number,
  rng: SeededRandom,
): void {
  const target = Math.max(
    BASE_DRAFT_PROSPECTS,
    countDraftSlots(league, seasonYear),
  )
  const usedNames = new Set(
    draftClass.prospects.map((p) => `${p.firstName} ${p.lastName}`),
  )
  const profile = pickDraftClassProfile(rng)
  const syntheticPlan = buildSyntheticTierPlan(profile)

  while (draftClass.prospects.length < target) {
    const position = POSITIONS[draftClass.prospects.length % POSITIONS.length]!
    const tier = syntheticPlan[draftClass.prospects.length] ?? 'longshot'
    draftClass.prospects.push(
      buildSyntheticProspect(
        draftClass.id,
        position,
        tier,
        profile,
        usedNames,
        rng,
      ),
    )
  }

  draftClass.syntheticProspectCount =
    draftClass.prospects.length - draftClass.realProspectCount
}

export function isCompensationDraftPick(pick: DraftPick): boolean {
  return pick.id.startsWith('comp-')
}

export function countDraftSlots(
  league: LeagueState,
  seasonYear: number,
): number {
  const seasonLabel = formatSeasonLabel(seasonYear)
  return league.draftPicks.filter(
    (p) => p.season === seasonLabel && p.pickNumber > 0,
  ).length
}

export function totalDraftSlotsForSeason(
  league: LeagueState,
  seasonYear: number,
): number {
  const seasonLabel = formatSeasonLabel(seasonYear)
  return league.draftPicks.filter((p) => p.season === seasonLabel).length
}

export function draftTeamCount(league: LeagueState): number {
  return Object.keys(league.teams).length
}

export function pickRoundForSlot(
  league: LeagueState,
  pickNumber: number,
): 1 | 2 {
  const firstRoundSlots = draftTeamCount(league)
  return pickNumber <= firstRoundSlots ? 1 : 2
}

/** Next sequential pick slot from logged results (not lowest numbered asset). */
export function getNextDraftPickNumber(draft: Draft): number {
  const taken = new Set(draft.picks.map((p) => p.pickNumber))
  let next = 1
  while (taken.has(next)) next++
  return next
}

/**
 * Keep draft-night pick assets aligned with the draft pick feed.
 * Clears phantom asset marks that skipped the feed; backfills missing marks.
 */
export function reconcileDraftPickState(
  league: LeagueState,
  draft: Draft,
): boolean {
  const seasonLabel = formatSeasonLabel(draft.seasonYear)
  const seasonAssets = league.draftPicks.filter((p) => p.season === seasonLabel)
  const loggedByPickNumber = new Map(
    draft.picks.map((p) => [p.pickNumber, p] as const),
  )
  const loggedByPickId = new Map(draft.picks.map((p) => [p.pickId, p] as const))
  let changed = false

  for (const asset of seasonAssets) {
    if (!asset.prospectId || asset.pickNumber <= 0) continue

    const logged =
      loggedByPickId.get(asset.id) ??
      loggedByPickNumber.get(asset.pickNumber)

    if (!logged) {
      asset.prospectId = null
      changed = true
      continue
    }

    if (asset.prospectId !== logged.prospectId) {
      asset.prospectId = logged.prospectId
      changed = true
    }
  }

  for (const result of draft.picks) {
    const asset =
      league.draftPicks.find((p) => p.id === result.pickId) ??
      seasonAssets.find((p) => p.pickNumber === result.pickNumber)
    if (!asset) continue
    if (asset.prospectId !== result.prospectId) {
      asset.prospectId = result.prospectId
      changed = true
    }
  }

  return changed
}

/** Align current pick + completion status with the pick feed only. */
export function syncDraftClock(league: LeagueState, draft: Draft): void {
  const seasonLabel = formatSeasonLabel(draft.seasonYear)
  const seasonPicks = league.draftPicks.filter((p) => p.season === seasonLabel)
  const totalSlots = seasonPicks.length

  if (
    totalSlots > 0 &&
    seasonPicks.every((p) => p.prospectId != null) &&
    draft.picks.length >= totalSlots
  ) {
    draft.status = 'complete'
    draft.completedAt = draft.completedAt ?? league.currentDate
    return
  }

  const nextPick = getNextDraftPickNumber(draft)

  if (totalSlots > 0 && nextPick > totalSlots && draft.picks.length > 0) {
    draft.status = 'complete'
    draft.completedAt = draft.completedAt ?? league.currentDate
    return
  }

  draft.status = 'in_progress'
  draft.completedAt = undefined
  draft.currentPickNumber = nextPick
}

export function countPicksMade(draft: Draft): number {
  return draft.picks.filter((p) => p.prospectId !== FORFEITED_PROSPECT_ID).length
}

export function getUserDraftPickSlots(
  league: LeagueState,
  draftYear: number,
  userTeamId: string,
): UserDraftPickSlot[] {
  const seasonLabel = formatSeasonLabel(draftYear)
  return league.draftPicks
    .filter(
      (p) =>
        p.season === seasonLabel &&
        p.currentTeamId === userTeamId &&
        !p.prospectId &&
        p.pickNumber > 0,
    )
    .sort((a, b) => a.pickNumber - b.pickNumber)
    .map((p) => ({
      pickNumber: p.pickNumber,
      round: p.round,
      pickId: p.id,
    }))
}

export function getDraftOrderBoard(
  league: LeagueState,
  draft: Draft,
): DraftOrderBoardEntry[] {
  const seasonLabel = formatSeasonLabel(draft.seasonYear)
  const entries: DraftOrderBoardEntry[] = []
  const lotteryOrder = draft.lotteryResults ?? []

  for (const slot of lotteryOrder) {
    for (const round of [1, 2] as const) {
      const pick = league.draftPicks.find(
        (p) =>
          p.season === seasonLabel &&
          p.round === round &&
          !isCompensationDraftPick(p) &&
          p.originalTeamId === slot.teamId &&
          p.pickNumber > 0,
      )
      if (!pick) continue
      entries.push({
        pickNumber: pick.pickNumber,
        originalTeamId: pick.originalTeamId,
        currentTeamId: pick.currentTeamId,
        round,
        traded: pick.originalTeamId !== pick.currentTeamId,
      })
    }
  }

  for (const pick of league.draftPicks) {
    if (pick.season !== seasonLabel) continue
    if (!isCompensationDraftPick(pick) || pick.pickNumber <= 0) continue
    entries.push({
      pickNumber: pick.pickNumber,
      originalTeamId: pick.originalTeamId,
      currentTeamId: pick.currentTeamId,
      round: pick.round,
      traded: pick.originalTeamId !== pick.currentTeamId,
    })
  }

  return entries.sort((a, b) => a.pickNumber - b.pickNumber)
}

export function picksUntilUserTurn(
  draft: Draft,
  userSlots: UserDraftPickSlot[],
): number | null {
  if (userSlots.length === 0) return null
  const nextSlot = userSlots[0]!.pickNumber
  const nextPick = getNextDraftPickNumber(draft)
  if (nextPick >= nextSlot) return 0
  return nextSlot - nextPick
}

/** True when the user should see the pick panel and make a selection. */
export function isUserOnClock(
  league: LeagueState,
  draft: Draft,
  userTeamId: string,
): boolean {
  const owner = getCurrentPickOwner(league, draft)
  if (owner?.teamId !== userTeamId) return false

  const userSlots = getUserDraftPickSlots(league, draft.seasonYear, userTeamId)
  const nextUserSlot = userSlots[0]?.pickNumber
  if (nextUserSlot == null) return false

  const nextPick = getNextDraftPickNumber(draft)
  return draft.currentPickNumber === nextUserSlot && nextPick === nextUserSlot
}

function buildRealProspect(
  real: RealProspectData,
  classId: string,
  rng: SeededRandom,
): DraftProspect {
  const archetype =
    DRAFT_ARCHETYPES.find((a) => a.id === real.archetype) ??
    pickArchetypeForPosition(real.position)
  const variance = rng.nextInt(-5, 5)
  const trueRatings = real.ratings
    ? fillRatings(real.ratings, real.position)
    : buildRatingsFromArchetype(archetype, variance)
  trueRatings.overall = computeOverall(trueRatings, real.position)
  const truePotential =
    real.potential ??
    rng.nextInt(archetype.potentialRange[0], archetype.potentialRange[1])

  return createProspect({
    classId,
    firstName: real.firstName,
    lastName: real.lastName,
    age: real.age,
    position: real.position,
    secondaryPositions: real.secondaryPositions ?? [],
    heightInches: real.heightInches,
    weightLbs: real.weightLbs,
    archetype: archetype.label,
    trueRatings,
    truePotential,
    bustRisk: real.bustRisk ?? archetype.bustRisk,
    breakoutChance: real.breakoutChance ?? archetype.breakoutChance,
    source: 'real',
    externalId: real.externalId,
    rng,
  })
}

function buildSyntheticProspect(
  classId: string,
  position: Position,
  tierId: ProspectTierId,
  profile: DraftClassProfile,
  usedNames: Set<string>,
  rng: SeededRandom,
): DraftProspect {
  const archetype = pickArchetypeForPosition(position)
  const variance = rng.nextInt(-8, 8)
  const trueRatings = buildRatingsFromArchetype(archetype, variance)
  const tier = PROSPECT_TIERS[tierId]
  const ratingBonus =
    tier.id === 'franchise' || tier.id === 'all_star'
      ? profile.topTalentBonus
      : profile.depthBonus
  const targetOverall = rng.nextInt(
    tier.overallRange[0] + ratingBonus,
    tier.overallRange[1] + ratingBonus,
  )
  tuneRatingsToOverall(trueRatings, position, targetOverall, rng)
  const truePotential = clampRating(
    rng.nextInt(tier.potentialRange[0], tier.potentialRange[1]) + ratingBonus,
  )
  const { firstName, lastName } = pickRandomName(usedNames, rng)

  return createProspect({
    classId,
    firstName,
    lastName,
    age: rng.nextInt(18, 22),
    position,
    secondaryPositions: archetype.positions.filter((p) => p !== position),
    heightInches: rng.nextInt(72, 86),
    weightLbs: rng.nextInt(175, 260),
    archetype: archetype.label,
    trueRatings,
    truePotential,
    bustRisk: rng.nextFloat(tier.bustRisk[0], tier.bustRisk[1]),
    breakoutChance: rng.nextFloat(
      tier.breakoutChance[0],
      tier.breakoutChance[1],
    ),
    source: 'synthetic',
    rng,
  })
}

function pickDraftClassProfile(rng: SeededRandom): DraftClassProfile {
  return rng.weightedPick(DRAFT_CLASS_PROFILES, [18, 52, 23, 7])
}

function buildSyntheticTierPlan(profile: DraftClassProfile): ProspectTierId[] {
  const plan: ProspectTierId[] = []
  for (const tier of [
    'franchise',
    'all_star',
    'starter',
    'rotation',
    'second_round',
  ] as ProspectTierId[]) {
    const count = profile.tierCounts[tier] ?? 0
    for (let i = 0; i < count; i++) plan.push(tier)
  }
  while (plan.length < BASE_DRAFT_PROSPECTS) plan.push('longshot')
  return plan
}

function tuneRatingsToOverall(
  ratings: PlayerRatings,
  position: Position,
  targetOverall: number,
  rng: SeededRandom,
): void {
  for (let step = 0; step < 8; step++) {
    const current = computeOverall(ratings, position)
    const delta = targetOverall - current
    if (Math.abs(delta) <= 1) break
    const adjustment = Math.trunc(delta / 2) || Math.sign(delta)
    for (const key of RATING_KEYS) {
      const value = ratings[key]
      if (typeof value !== 'number') continue
      const jitter = rng.nextInt(-1, 1)
      ratings[key] = clampRating(value + adjustment + jitter)
    }
  }
  ratings.overall = computeOverall(ratings, position)
}

function createProspect(opts: {
  classId: string
  firstName: string
  lastName: string
  age: number
  position: Position
  secondaryPositions: Position[]
  heightInches: number
  weightLbs: number
  archetype: string
  trueRatings: PlayerRatings
  truePotential: number
  bustRisk: number
  breakoutChance: number
  source: 'real' | 'synthetic'
  externalId?: string
  rng: SeededRandom
}): DraftProspect {
  const spread = opts.bustRisk > 0.17 ? 18 : opts.bustRisk > 0.13 ? 14 : 10
  const riskLevel: DraftProspect['riskLevel'] =
    opts.bustRisk > 0.17 ? 'high' : opts.bustRisk > 0.13 ? 'medium' : 'low'

  return {
    id: `prospect-${opts.classId}-${opts.firstName}-${opts.lastName}-${opts.rng.nextInt(1000, 9999)}`,
    draftClassId: opts.classId,
    firstName: opts.firstName,
    lastName: opts.lastName,
    age: opts.age,
    position: opts.position,
    secondaryPositions: opts.secondaryPositions,
    heightInches: opts.heightInches,
    weightLbs: opts.weightLbs,
    archetype: opts.archetype,
    visibleRatings: { overall: clampRating(opts.trueRatings.overall - spread) },
    trueRatings: opts.trueRatings,
    visiblePotentialRange: [
      clampRating(opts.truePotential - spread),
      clampRating(opts.truePotential + spread),
    ],
    truePotential: opts.truePotential,
    projectedRange: [
      clampRating(opts.trueRatings.overall - 5),
      clampRating(opts.trueRatings.overall + opts.breakoutChance * 20),
    ],
    scoutingReport: [`${opts.archetype} prospect from ${opts.source} data.`],
    riskLevel,
    scoutingPoints: 0,
    scoutedByTeamId: null,
    bustRisk: opts.bustRisk,
    breakoutChance: opts.breakoutChance,
    source: opts.source,
    externalId: opts.externalId,
  }
}

function fillRatings(
  partial: Partial<PlayerRatings>,
  position: Position,
): PlayerRatings {
  const archetype = pickArchetypeForPosition(position)
  const base = buildRatingsFromArchetype(archetype, 0)
  return { ...base, ...partial, overall: partial.overall ?? base.overall }
}

export function formatTeamDisplayName(
  league: LeagueState,
  teamId: string | undefined,
): string {
  if (!teamId) return 'Unknown'
  const team = league.teams[teamId]
  if (!team) return 'Unknown'
  if (team.city && team.name) return `${team.city} ${team.name}`
  return team.name || team.abbreviation || teamId
}

function sortTeamsByRecordAsc(
  league: LeagueState,
  teamIds: string[],
): string[] {
  return [...teamIds].sort((a, b) => {
    const sa = league.standings[a]
    const sb = league.standings[b]
    const winsA = sa?.wins ?? 0
    const winsB = sb?.wins ?? 0
    if (winsA !== winsB) return winsA - winsB
    return (sb?.losses ?? 82) - (sa?.losses ?? 82)
  })
}

function drawLotteryOrder(
  league: LeagueState,
  lotteryTeams: string[],
  rng: SeededRandom,
): string[] {
  const remaining = [...lotteryTeams]
  const topFour: string[] = []
  const pool = LOTTERY_ODDS.slice(0, remaining.length)

  for (let i = 0; i < Math.min(4, remaining.length); i++) {
    const weights = remaining.map((teamId) => {
      const rank = lotteryTeams.indexOf(teamId) + 1
      return pool.find((p) => p.rank === rank)?.combinations ?? 1
    })
    const picked = rng.weightedPick(remaining, weights)
    topFour.push(picked)
    remaining.splice(remaining.indexOf(picked), 1)
  }

  const restByRecord = sortTeamsByRecordAsc(league, remaining)
  return [...topFour, ...restByRecord]
}

export function getNonPlayoffTeams(league: LeagueState): string[] {
  const playoffTeams = new Set<string>()
  const bracket = league.playoffBracket
  if (bracket) {
    for (const s of [...bracket.east, ...bracket.west]) {
      if (s.winnerTeamId) playoffTeams.add(s.winnerTeamId)
      playoffTeams.add(s.higherSeedTeamId)
      playoffTeams.add(s.lowerSeedTeamId)
    }
  }

  const allTeams = Object.keys(league.teams)
  const nonPlayoff = allTeams.filter((id) => {
    const standing = league.standings[id]
    if (!standing) return true
    return !standing.clinchedPlayoff && !playoffTeams.has(id)
  })

  const sorted = sortTeamsByRecordAsc(league, nonPlayoff)
  if (sorted.length === 0) {
    return sortTeamsByRecordAsc(league, allTeams)
  }
  return sorted
}

export function runLottery(
  league: LeagueState,
  rng: SeededRandom,
): { teamId: string; pickNumber: number }[] {
  const teamCount = Object.keys(league.teams).length
  if (teamCount === 0) return []

  const lotteryPool = getNonPlayoffTeams(league).slice(0, 14)
  const lotteryOrdered =
    lotteryPool.length > 0
      ? drawLotteryOrder(league, lotteryPool, rng)
      : sortTeamsByRecordAsc(league, Object.keys(league.teams)).slice(
          0,
          Math.min(14, teamCount),
        )

  const lotterySet = new Set(lotteryOrdered)
  const playoffOrdered = sortTeamsByRecordAsc(
    league,
    Object.keys(league.teams).filter((id) => !lotterySet.has(id)),
  )

  const fullOrder = [...lotteryOrdered, ...playoffOrdered].slice(0, teamCount)
  return fullOrder.map((teamId, idx) => ({ teamId, pickNumber: idx + 1 }))
}

export function runInverseWLDraftOrder(
  league: LeagueState,
): { teamId: string; pickNumber: number }[] {
  const ordered = sortTeamsByRecordAsc(league, Object.keys(league.teams))
  return ordered.map((teamId, idx) => ({ teamId, pickNumber: idx + 1 }))
}

export function repairDraftPickOrder(
  league: LeagueState,
  draft: Draft,
  rng: SeededRandom,
): boolean {
  const seasonLabel = formatSeasonLabel(draft.seasonYear)
  const seasonPicks = league.draftPicks.filter((p) => p.season === seasonLabel)
  const total = seasonPicks.length
  const assigned = seasonPicks.filter((p) => p.pickNumber > 0).length
  const unpicked = seasonPicks.filter((p) => !p.prospectId).length
  const openNumbered = seasonPicks.filter(
    (p) => !p.prospectId && p.pickNumber > 0,
  ).length
  const hasUnnumberedUnpicked = seasonPicks.some(
    (p) => !p.prospectId && p.pickNumber === 0,
  )

  const needsRepair =
    total > 0 &&
    (assigned < total ||
      (unpicked > 0 && openNumbered === 0) ||
      hasUnnumberedUnpicked)

  if (!needsRepair) return false

  const picksAlreadyMade = draft.picks.length > 0
  let order: { teamId: string; pickNumber: number }[] | undefined

  if (draft.lotteryResults && draft.lotteryResults.length > 0) {
    order = draft.lotteryResults
  } else if (picksAlreadyMade) {
    return false
  } else {
    order =
      draft.orderSource === 'lottery'
        ? runLottery(league, rng)
        : runInverseWLDraftOrder(league)
  }

  if (!order || order.length === 0) return false

  for (const pick of seasonPicks) {
    if (!pick.prospectId) {
      pick.pickNumber = 0
    }
  }

  assignPickNumbers(league, order, seasonLabel)
  if (!draft.lotteryResults || draft.lotteryResults.length === 0) {
    draft.lotteryResults = order
  }
  reconcileDraftPickState(league, draft)
  syncDraftClock(league, draft)
  return true
}

export function assignPickNumbers(
  league: LeagueState,
  order: { teamId: string; pickNumber: number }[],
  seasonLabel: string,
): void {
  const orderMap = new Map(order.map((o) => [o.teamId, o.pickNumber]))
  const teamCount = Object.keys(league.teams).length

  for (const pick of league.draftPicks) {
    if (pick.season !== seasonLabel) continue
    if (isCompensationDraftPick(pick)) continue
    if (pick.round === 1) {
      const slot = orderMap.get(pick.originalTeamId)
      if (slot) pick.pickNumber = slot
    } else if (pick.round === 2) {
      const slot = orderMap.get(pick.originalTeamId)
      if (slot) pick.pickNumber = teamCount + slot
    }
  }

  assignCompensationPickNumbers(league, seasonLabel)
}

function assignCompensationPickNumbers(
  league: LeagueState,
  seasonLabel: string,
): void {
  const compPicks = league.draftPicks
    .filter((p) => p.season === seasonLabel && isCompensationDraftPick(p))
    .sort((a, b) => a.id.localeCompare(b.id))

  const maxSlot = league.draftPicks
    .filter((p) => p.season === seasonLabel && !isCompensationDraftPick(p))
    .reduce((max, p) => Math.max(max, p.pickNumber), 0)

  let next = maxSlot + 1
  for (const pick of compPicks) {
    pick.pickNumber = next++
  }
}

export function startDraft(
  league: LeagueState,
  draftClass: DraftClass,
  order: { teamId: string; pickNumber: number }[],
  orderSource: Draft['orderSource'],
): Draft {
  const draftId = `draft-${draftClass.seasonYear}`
  const draft: Draft = {
    id: draftId,
    seasonYear: draftClass.seasonYear,
    draftClassId: draftClass.id,
    status: 'in_progress',
    lotteryResults: order,
    picks: [],
    currentPickNumber: 1,
    startedAt: league.currentDate,
    orderSource,
  }
  league.drafts[draftId] = draft
  league.draftClasses[draftClass.id] = draftClass

  return draft
}

export function getDraftClassForYear(
  league: LeagueState,
  seasonYear: number,
): DraftClass | undefined {
  return Object.values(league.draftClasses).find(
    (c) => c?.seasonYear === seasonYear,
  )
}

export function getDraftForYear(
  league: LeagueState,
  seasonYear: number,
): Draft | undefined {
  return Object.values(league.drafts).find((d) => d?.seasonYear === seasonYear)
}

/** Draft for the upcoming draft year while the league is in draft phase. */
export function getActiveDraft(league: LeagueState): Draft | undefined {
  if (league.phase !== 'draft') return undefined
  const draftYear = league.seasonYear + 1
  return getDraftForYear(league, draftYear)
}

export function getCurrentPickOwner(
  league: LeagueState,
  draft: Draft,
): { teamId: string; pickId: string } | null {
  const seasonLabel = formatSeasonLabel(draft.seasonYear)
  const pickNumber = draft.currentPickNumber
  const teamCount = draftTeamCount(league)
  const round: 1 | 2 = pickNumber <= teamCount ? 1 : 2

  let slotPicks = league.draftPicks
    .filter(
      (p) =>
        p.season === seasonLabel &&
        p.pickNumber === pickNumber &&
        !p.prospectId,
    )
    .sort((a, b) => {
      if (isCompensationDraftPick(a) !== isCompensationDraftPick(b)) {
        return isCompensationDraftPick(a) ? 1 : -1
      }
      return a.id.localeCompare(b.id)
    })

  if (slotPicks.length === 0 && draft.lotteryResults?.length) {
    const lotterySlot =
      round === 1 ? pickNumber : pickNumber - teamCount
    const originalTeamId = draft.lotteryResults.find(
      (o) => o.pickNumber === lotterySlot,
    )?.teamId
    if (originalTeamId) {
      slotPicks = league.draftPicks
        .filter(
          (p) =>
            p.season === seasonLabel &&
            p.round === round &&
            !isCompensationDraftPick(p) &&
            p.originalTeamId === originalTeamId &&
            !p.prospectId,
        )
        .sort((a, b) => a.id.localeCompare(b.id))
    }
  }

  const pick = slotPicks[0]
  if (!pick) return null
  return { teamId: pick.currentTeamId, pickId: pick.id }
}

export function getAvailableProspects(
  league: LeagueState,
  draft: Draft,
): DraftProspect[] {
  const draftClass = league.draftClasses[draft.draftClassId]
  if (!draftClass) return []
  const taken = new Set(draft.picks.map((p) => p.prospectId))
  return draftClass.prospects.filter((p) => !taken.has(p.id))
}

export function canTeamDraft(
  league: LeagueState,
  teamId: string,
): { ok: boolean; reason?: string } {
  const team = league.teams[teamId]
  if (!team) return { ok: false, reason: 'Team not found.' }
  const cap = league.rosterSizeCap ?? 20
  if (team.roster.length >= cap) {
    return { ok: false, reason: `Roster at soft cap (${cap}).` }
  }
  return { ok: true }
}

export function simulateDraftPick(
  league: LeagueState,
  draft: Draft,
  teamId: string,
  prospectId: string,
  isTwoWay: boolean,
  _rng: SeededRandom,
): DraftPickResult | { error: string } {
  const rosterCheck = canTeamDraft(league, teamId)
  if (!rosterCheck.ok) return { error: rosterCheck.reason ?? 'Cannot draft.' }

  const available = getAvailableProspects(league, draft)
  const prospect = available.find((p) => p.id === prospectId)
  if (!prospect) return { error: 'Prospect not available.' }

  const owner = getCurrentPickOwner(league, draft)
  if (owner?.teamId !== teamId) {
    return { error: 'Not your pick.' }
  }

  const pickAsset = league.draftPicks.find((p) => p.id === owner.pickId)
  if (!pickAsset) return { error: 'Pick not found.' }

  const result: DraftPickResult = {
    id: `pick-result-${draft.id}-${draft.currentPickNumber}`,
    draftId: draft.id,
    pickId: owner.pickId,
    prospectId,
    pickedByTeamId: teamId,
    pickNumber: draft.currentPickNumber,
    round: pickRoundForSlot(league, draft.currentPickNumber),
    isTwoWay,
  }

  draft.picks.push(result)
  pickAsset.prospectId = prospectId
  syncDraftClock(league, draft)

  return result
}

export function forfeitDraftPick(league: LeagueState, draft: Draft): boolean {
  const owner = getCurrentPickOwner(league, draft)
  if (!owner) return false

  const pickAsset = league.draftPicks.find((p) => p.id === owner.pickId)
  if (!pickAsset) return false

  pickAsset.prospectId = FORFEITED_PROSPECT_ID

  draft.picks.push({
    id: `pick-result-${draft.id}-${draft.currentPickNumber}-forfeit`,
    draftId: draft.id,
    pickId: owner.pickId,
    prospectId: FORFEITED_PROSPECT_ID,
    pickedByTeamId: owner.teamId,
    pickNumber: draft.currentPickNumber,
    round: pickRoundForSlot(league, draft.currentPickNumber),
    isTwoWay: false,
  })

  syncDraftClock(league, draft)

  return true
}

export function autoPickForTeam(
  league: LeagueState,
  draft: Draft,
  teamId: string,
  rng: SeededRandom,
): DraftPickResult | { error: string } | null {
  const owner = getCurrentPickOwner(league, draft)
  if (owner?.teamId !== teamId) return null

  const available = getAvailableProspects(league, draft)
  if (available.length === 0) return { error: 'No prospects left.' }

  const pickNumber = draft.currentPickNumber
  const useFullScouting = teamId !== league.userTeamId
  const sorted = [...available].sort(
    (a, b) =>
      draftBoardValue(league, teamId, b, pickNumber, useFullScouting) -
      draftBoardValue(league, teamId, a, pickNumber, useFullScouting),
  )
  const direction = league.teams[teamId]?.direction ?? 'middle'
  const teamCount = draftTeamCount(league)
  const candidatePool = pickCandidatePoolSize(pickNumber, direction)
  const pick =
    sorted[rng.nextInt(0, Math.min(candidatePool - 1, sorted.length - 1))]!
  const rosterCap = league.rosterSizeCap ?? 20
  const rosterLen = league.teams[teamId]?.roster.length ?? 0
  const isLateSecondRound = pickNumber > teamCount + teamCount * 0.6
  const useTwoWay =
    useFullScouting &&
    isLateSecondRound &&
    rosterLen >= rosterCap - 3 &&
    rng.nextFloat(0, 1) < 0.35
  return simulateDraftPick(league, draft, teamId, pick.id, useTwoWay, rng)
}

function pickCandidatePoolSize(
  pickNumber: number,
  direction: TeamDirection,
): number {
  if (pickNumber <= 5) return direction === 'rebuilding' || direction === 'tanking' ? 4 : 3
  if (pickNumber <= 14) return 4
  if (pickNumber <= 20) return 5
  return 7
}

function draftDirectionWeights(
  direction: TeamDirection,
  pickNumber: number,
): {
  upsideWeight: number
  needWeight: number
  riskPenalty: number
  overallWeight: number
} {
  const isEarlyPick = pickNumber <= 14
  const isLatePick = pickNumber > 30
  const isRebuild =
    direction === 'rebuilding' || direction === 'tanking'
  const isContender =
    direction === 'contender' || direction === 'playoff_push'

  let upsideWeight = isEarlyPick ? 0.22 : isLatePick ? 0.1 : 0.16
  let needWeight = isEarlyPick ? 0.08 : isLatePick ? 0.18 : 0.13
  let riskPenalty = isEarlyPick ? 14 : isLatePick ? 6 : 10
  let overallWeight = 0.68

  if (isRebuild && isEarlyPick) {
    upsideWeight += 0.08
    needWeight -= 0.03
    riskPenalty -= 2
  }
  if (isContender && isEarlyPick) {
    needWeight += 0.06
    upsideWeight -= 0.04
    riskPenalty += 3
  }
  if (isContender && isLatePick) {
    needWeight += 0.08
    overallWeight += 0.05
  }
  if (isRebuild && isLatePick) {
    upsideWeight += 0.06
    overallWeight -= 0.04
  }

  return { upsideWeight, needWeight, riskPenalty, overallWeight }
}

export function draftBoardValue(
  league: LeagueState,
  teamId: string,
  prospect: DraftProspect,
  pickNumber: number,
  useFullScouting = true,
): number {
  const overall = useFullScouting
    ? prospect.trueRatings.overall
    : (prospect.visibleRatings.overall ?? prospect.trueRatings.overall - 8)
  const potential = useFullScouting
    ? prospect.truePotential
    : (prospect.visiblePotentialRange[0] + prospect.visiblePotentialRange[1]) / 2
  const upside = Math.max(0, potential - overall)
  const need = positionNeedScore(league, teamId, prospect)
  const direction = league.teams[teamId]?.direction ?? 'middle'
  const weights = draftDirectionWeights(direction, pickNumber)

  return (
    overall * weights.overallWeight +
    potential * 0.18 +
    upside * weights.upsideWeight +
    need * weights.needWeight +
    prospect.breakoutChance * 12 -
    prospect.bustRisk * weights.riskPenalty
  )
}

function positionNeedScore(
  league: LeagueState,
  teamId: string,
  prospect: DraftProspect,
): number {
  const team = league.teams[teamId]
  if (!team) return 0

  const positions = [prospect.position, ...prospect.secondaryPositions]
  let bestNeed = 0
  for (const position of positions) {
    const players = team.roster
      .map((id) => league.players[id])
      .filter(
        (p): p is Player =>
          p !== undefined &&
          (p.position === position || p.secondaryPositions.includes(position)),
      )
      .sort((a, b) => b.ratings.overall - a.ratings.overall)

    const starter = players[0]?.ratings.overall ?? 45
    const depth = players[1]?.ratings.overall ?? 42
    const youngCore = players.some(
      (p) =>
        p.age <= 24 && p.ratings.potential >= 82 && p.ratings.overall >= 68,
    )
    const need =
      Math.max(0, 82 - starter) * 0.75 + Math.max(0, 74 - depth) * 0.35
    bestNeed = Math.max(bestNeed, youngCore ? need * 0.65 : need)
  }

  return bestNeed
}

export function autoDraftOffClock(
  league: LeagueState,
  draft: Draft,
  userTeamId: string,
  rng: SeededRandom,
): void {
  const maxIterations = totalDraftSlotsForSeason(league, draft.seasonYear)
  let iterations = 0

  while (draft.status === 'in_progress' && iterations < maxIterations) {
    iterations++
    const owner = getCurrentPickOwner(league, draft)
    if (!owner) break
    if (owner.teamId === userTeamId) break

    const result = autoPickForTeam(league, draft, owner.teamId, rng)
    if (result === null) break
    if ('error' in result) {
      if (!forfeitDraftPick(league, draft)) break
    }
  }
}
