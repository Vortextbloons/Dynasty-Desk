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
import { initScoutingForDraftClass } from './scoutingEngine'
import type { DraftPick } from '@/game/models/draft'

export const BASE_DRAFT_PROSPECTS = 60
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

  while (prospects.length < BASE_DRAFT_PROSPECTS) {
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
  const target = Math.max(BASE_DRAFT_PROSPECTS, countDraftSlots(league, seasonYear))
  const usedNames = new Set(
    draftClass.prospects.map((p) => `${p.firstName} ${p.lastName}`),
  )

  while (draftClass.prospects.length < target) {
    const position = POSITIONS[draftClass.prospects.length % POSITIONS.length]!
    draftClass.prospects.push(
      buildSyntheticProspect(draftClass.id, position, usedNames, rng),
    )
  }

  draftClass.syntheticProspectCount =
    draftClass.prospects.length - draftClass.realProspectCount
}

export function isCompensationDraftPick(pick: DraftPick): boolean {
  return pick.id.startsWith('comp-')
}

export function countDraftSlots(league: LeagueState, seasonYear: number): number {
  const seasonLabel = formatSeasonLabel(seasonYear)
  return league.draftPicks.filter(
    (p) => p.season === seasonLabel && p.pickNumber > 0,
  ).length
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

function sortTeamsByRecordAsc(league: LeagueState, teamIds: string[]): string[] {
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
  if (countDraftSlots(league, draft.seasonYear) > 0) return false

  const seasonLabel = formatSeasonLabel(draft.seasonYear)
  const order =
    draft.lotteryResults && draft.lotteryResults.length > 0
      ? draft.lotteryResults
      : draft.orderSource === 'lottery'
        ? runLottery(league, rng)
        : runInverseWLDraftOrder(league)

  if (order.length === 0) return false

  assignPickNumbers(league, order, seasonLabel)
  if (!draft.lotteryResults || draft.lotteryResults.length === 0) {
    draft.lotteryResults = order
  }
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

function assignCompensationPickNumbers(league: LeagueState, seasonLabel: string): void {
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
  return Object.values(league.draftClasses).find((c) => c?.seasonYear === seasonYear)
}

export function getDraftForYear(league: LeagueState, seasonYear: number): Draft | undefined {
  return Object.values(league.drafts).find((d) => d?.seasonYear === seasonYear)
}

export function getCurrentPickOwner(
  league: LeagueState,
  draft: Draft,
): { teamId: string; pickId: string } | null {
  const seasonLabel = formatSeasonLabel(draft.seasonYear)
  const slotPicks = league.draftPicks
    .filter(
      (p) =>
        p.season === seasonLabel &&
        p.pickNumber === draft.currentPickNumber &&
        !p.prospectId,
    )
    .sort((a, b) => {
      if (isCompensationDraftPick(a) !== isCompensationDraftPick(b)) {
        return isCompensationDraftPick(a) ? 1 : -1
      }
      return a.id.localeCompare(b.id)
    })
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
    round: draft.currentPickNumber <= 30 ? 1 : 2,
    isTwoWay,
  }

  draft.picks.push(result)
  pickAsset.prospectId = prospectId
  draft.currentPickNumber++

  const totalSlots = countDraftSlots(league, draft.seasonYear)
  if (draft.currentPickNumber > totalSlots) {
    draft.status = 'complete'
    draft.completedAt = league.currentDate
  }

  return result
}

export function forfeitDraftPick(league: LeagueState, draft: Draft): boolean {
  const owner = getCurrentPickOwner(league, draft)
  if (!owner) return false

  const pickAsset = league.draftPicks.find((p) => p.id === owner.pickId)
  if (!pickAsset) return false

  pickAsset.prospectId = '__forfeited__'

  draft.picks.push({
    id: `pick-result-${draft.id}-${draft.currentPickNumber}-forfeit`,
    draftId: draft.id,
    pickId: owner.pickId,
    prospectId: '__forfeited__',
    pickedByTeamId: owner.teamId,
    pickNumber: draft.currentPickNumber,
    round: draft.currentPickNumber <= 30 ? 1 : 2,
    isTwoWay: false,
  })

  draft.currentPickNumber++

  const totalSlots = countDraftSlots(league, draft.seasonYear)
  if (draft.currentPickNumber > totalSlots) {
    draft.status = 'complete'
    draft.completedAt = league.currentDate
  }

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

    const result = autoPickForTeam(league, draft, owner.teamId, rng)
    if (result && 'error' in result) {
      if (!forfeitDraftPick(league, draft)) break
    }
  }
}
