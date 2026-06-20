import type { LeagueState } from '@/game/models/league'
import type { DraftClass, DraftProspect, Draft, DraftPickResult } from '@/game/models/draft'
import type { LeagueRules } from '@/game/models/leagueRules'
import type { Position } from '@/game/models/position'
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
import { initScoutingState } from './scoutingEngine'

const TOTAL_PROSPECTS = 60
const POSITIONS: Position[] = ['PG', 'SG', 'SF', 'PF', 'C']

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
  const m = season.match(/^(\d{4})/)
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
    const res = await fetch(`${import.meta.env.BASE_URL}data/draft/real-draft-classes.json`)
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
  const usedNames = new Set<string>()
  const prospects: DraftProspect[] = []

  for (const real of realData) {
    prospects.push(buildRealProspect(real, classId, rng))
    usedNames.add(`${real.firstName} ${real.lastName}`)
  }

  while (prospects.length < TOTAL_PROSPECTS) {
    const position = POSITIONS[prospects.length % POSITIONS.length]!
    prospects.push(buildSyntheticProspect(classId, position, usedNames, rng))
  }

  return {
    id: classId,
    seasonYear,
    season,
    generatedAt: new Date().toISOString(),
    prospects,
    generatedBy: 'hybrid',
    realProspectCount: realData.length,
    syntheticProspectCount: TOTAL_PROSPECTS - realData.length,
  }
}

function buildRealProspect(
  real: RealProspectData,
  classId: string,
  rng: SeededRandom,
): DraftProspect {
  const archetype = DRAFT_ARCHETYPES.find((a) => a.id === real.archetype) ?? pickArchetypeForPosition(real.position)
  const variance = rng.nextInt(-5, 5)
  const trueRatings = real.ratings
    ? fillRatings(real.ratings, real.position)
    : buildRatingsFromArchetype(archetype, variance)
  trueRatings.overall = computeOverall(trueRatings, real.position)
  const truePotential = real.potential ?? rng.nextInt(archetype.potentialRange[0], archetype.potentialRange[1])

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
  usedNames: Set<string>,
  rng: SeededRandom,
): DraftProspect {
  const archetype = pickArchetypeForPosition(position)
  const variance = rng.nextInt(-8, 8)
  const trueRatings = buildRatingsFromArchetype(archetype, variance)
  trueRatings.overall = computeOverall(trueRatings, position)
  const truePotential = rng.nextInt(archetype.potentialRange[0], archetype.potentialRange[1])
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
    bustRisk: archetype.bustRisk + rng.nextFloat(0, 0.05),
    breakoutChance: archetype.breakoutChance + rng.nextFloat(0, 0.05),
    source: 'synthetic',
    rng,
  })
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

function fillRatings(partial: Partial<PlayerRatings>, position: Position): PlayerRatings {
  const archetype = pickArchetypeForPosition(position)
  const base = buildRatingsFromArchetype(archetype, 0)
  return { ...base, ...partial, overall: partial.overall ?? base.overall }
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

  return nonPlayoff.sort((a, b) => {
    const sa = league.standings[a]
    const sb = league.standings[b]
    const winsA = sa?.wins ?? 0
    const winsB = sb?.wins ?? 0
    if (winsA !== winsB) return winsA - winsB
    return (sa?.losses ?? 82) - (sb?.losses ?? 82)
  })
}

export function runLottery(
  league: LeagueState,
  rng: SeededRandom,
): { teamId: string; pickNumber: number }[] {
  const lotteryTeams = getNonPlayoffTeams(league).slice(0, 14)
  if (lotteryTeams.length === 0) {
    return runInverseWLDraftOrder(league)
  }

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

  const restByRecord = [...remaining].sort((a, b) => {
    const sa = league.standings[a]
    const sb = league.standings[b]
    return (sa?.wins ?? 0) - (sb?.wins ?? 0)
  })

  const ordered = [...topFour, ...restByRecord]
  return ordered.map((teamId, idx) => ({ teamId, pickNumber: idx + 1 }))
}

export function runInverseWLDraftOrder(
  league: LeagueState,
): { teamId: string; pickNumber: number }[] {
  const teams = getNonPlayoffTeams(league)
  const ordered = [...teams].sort((a, b) => {
    const sa = league.standings[a]
    const sb = league.standings[b]
    const winsA = sa?.wins ?? 0
    const winsB = sb?.wins ?? 0
    if (winsA !== winsB) return winsA - winsB
    return (sb?.losses ?? 0) - (sa?.losses ?? 0)
  })
  return ordered.map((teamId, idx) => ({ teamId, pickNumber: idx + 1 }))
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
    if (pick.round === 1) {
      const slot = orderMap.get(pick.originalTeamId)
      if (slot) pick.pickNumber = slot
    } else if (pick.round === 2) {
      const slot = orderMap.get(pick.originalTeamId)
      if (slot) pick.pickNumber = teamCount + slot
    }
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

  for (const teamId of Object.keys(league.teams)) {
    const key = `${teamId}-${draftClass.id}`
    league.scoutingState[key] = initScoutingState(teamId, draftClass.id)
  }

  return draft
}

export function getCurrentPickOwner(
  league: LeagueState,
  draft: Draft,
): { teamId: string; pickId: string } | null {
  const seasonLabel = formatSeasonLabel(draft.seasonYear)
  const pick = league.draftPicks.find(
    (p) =>
      p.season === seasonLabel &&
      p.round <= 2 &&
      p.pickNumber === draft.currentPickNumber &&
      !p.prospectId,
  )
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
  if (!owner || owner.teamId !== teamId) {
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
    round: draft.currentPickNumber <= 30 ? 1 : 2,
    isTwoWay,
  }

  draft.picks.push(result)
  pickAsset.prospectId = prospectId
  draft.currentPickNumber++

  if (draft.currentPickNumber > 60) {
    draft.status = 'complete'
    draft.completedAt = league.currentDate
  }

  return result
}

export function autoPickForTeam(
  league: LeagueState,
  draft: Draft,
  teamId: string,
  rng: SeededRandom,
): DraftPickResult | { error: string } | null {
  const owner = getCurrentPickOwner(league, draft)
  if (!owner || owner.teamId !== teamId) return null

  const available = getAvailableProspects(league, draft)
  if (available.length === 0) return { error: 'No prospects left.' }

  const sorted = [...available].sort(
    (a, b) => b.trueRatings.overall - a.trueRatings.overall,
  )
  const pick = sorted[rng.nextInt(0, Math.min(4, sorted.length - 1))]!
  return simulateDraftPick(league, draft, teamId, pick.id, false, rng)
}

export function autoDraftOffClock(
  league: LeagueState,
  draft: Draft,
  userTeamId: string,
  rng: SeededRandom,
): void {
  while (draft.status === 'in_progress') {
    const owner = getCurrentPickOwner(league, draft)
    if (!owner) break
    if (owner.teamId === userTeamId) break
    autoPickForTeam(league, draft, owner.teamId, rng)
  }
}
