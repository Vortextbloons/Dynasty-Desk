import type { LeagueState, LeaguePhase } from '@/game/models/league'
import type { StaticSnapshot } from '@/game/models/static'
import type { Player } from '@/game/models/player'
import type { NewsEvent } from '@/game/models/news'
import type { OffseasonEvent } from '@/game/models/offseason'
import type { DraftPick } from '@/game/models/draft'
import {
  isModernLotteryEra,
  runLottery,
  runInverseWLDraftOrder,
  generateDraftClass,
  loadRealDraftData,
  assignPickNumbers,
  startDraft,
  autoDraftOffClock,
  formatSeasonLabel,
  getDraftClassForYear,
  getDraftForYear,
} from './draftEngine'
import {
  expireContracts,
  generateCompensationPicks,
  generateQualifyingOffers,
  resolveDailyBatches,
  submitAIOffers,
  identifyFreeAgents,
} from '@/game/management/freeAgencyEngine'
import { generateRookieContract } from '@/game/management/rookieContractEngine'
import { prospectToPlayer } from './prospectConverter'
import { initScoutingForDraftClass } from './scoutingEngine'
import { generateSchedule } from './scheduleGenerator'
import { initializeStandings } from './standingsEngine'
import { getLeagueRules } from '@/game/models/leagueRules'
import { getEraConfig } from '@/game/models/eraConfig'
import type { SeededRandom } from '@/game/sim/rng'
import { addDays } from '@/lib/utils'

export const OFFSEASON_ROSTER_CAP = 20
export const REGULAR_SEASON_ROSTER_CAP = 15

const PHASE_ORDER: LeaguePhase[] = [
  'offseason',
  'draft',
  'free_agency',
  'preseason',
  'regular_season',
]

export function upcomingDraftYear(league: LeagueState): number {
  return league.seasonYear + 1
}

/** Contract expiry, QOs, comp picks, draft class + scouting — not championship/bonus work. */
export function beginOffseason(league: LeagueState, rng: SeededRandom): void {
  league.phase = 'offseason'
  league.rosterSizeCap = OFFSEASON_ROSTER_CAP

  const draftYear = upcomingDraftYear(league)
  if (!getDraftClassForYear(league, draftYear)) {
    const draftClass = generateDraftClass(draftYear, league.rules, [], rng)
    league.draftClasses[draftClass.id] = draftClass
    initScoutingForDraftClass(league, draftClass.id)
  }

  const expired = expireContracts(league)
  logOffseasonEvent(league, 'contract_expired', `${expired.length} contracts expired`, expired)

  const outgoingFAs: { playerId: string; teamId: string; salary: number }[] = []
  for (const pid of expired) {
    const p = league.players[pid]
    if (p) {
      outgoingFAs.push({
        playerId: pid,
        teamId: p.careerStats?.[p.careerStats.length - 1]?.teamId ?? '',
        salary: p.contract.salaryByYear[0] ?? 0,
      })
    }
  }

  league.compensationPicks = generateCompensationPicks(
    league,
    outgoingFAs.filter((f) => f.teamId),
    league.seasonYear,
  )
  mergeCompensationPicksIntoDraftPicks(league)

  const rfaCandidates = expired
    .map((pid) => {
      const p = league.players[pid]
      if (!p) return null
      const lastTeam = p.careerStats?.[p.careerStats.length - 1]?.teamId
      if (!lastTeam || p.age > 30) return null
      return { playerId: pid, teamId: lastTeam }
    })
    .filter(Boolean) as { playerId: string; teamId: string }[]

  league.qualifyingOffers = generateQualifyingOffers(league, rfaCandidates, league.currentDate)

  for (const team of Object.values(league.teams)) {
    if (team) {
      team.finances.exceptionsUsed = {
        mle: false,
        bae: false,
        roomMle: false,
        minimumCount: 0,
      }
    }
  }
}

export function mergeCompensationPicksIntoDraftPicks(league: LeagueState): void {
  for (const comp of league.compensationPicks) {
    if (league.draftPicks.some((p) => p.id === comp.id)) continue

    const seasonLabel = formatSeasonLabel(comp.seasonYear)
    const round2ForSeason = league.draftPicks.filter(
      (p) => p.season === seasonLabel && p.round === 2,
    )
    const maxSlot = round2ForSeason.reduce((max, p) => Math.max(max, p.pickNumber), 0)
    const teamCount = Object.keys(league.teams).length

    const pick: DraftPick = {
      id: comp.id,
      season: seasonLabel,
      round: 2,
      pickNumber: maxSlot > 0 ? maxSlot + 1 : teamCount + 1,
      originalTeamId: comp.originalTeamId,
      currentTeamId: comp.currentTeamId,
      prospectId: null,
    }
    league.draftPicks.push(pick)
  }
}

export function canAdvancePhase(
  league: LeagueState,
): { ok: true } | { ok: false; reason: string } {
  const next = getNextPhase(league.phase)
  if (!next) {
    return { ok: false, reason: 'No further offseason phases to advance.' }
  }

  if (league.phase === 'draft' && next === 'free_agency') {
    const draft = getDraftForYear(league, upcomingDraftYear(league))
    if (!draft) {
      return { ok: false, reason: 'Draft has not started.' }
    }
    if (draft.status !== 'complete') {
      return {
        ok: false,
        reason: 'Complete all draft picks before advancing to free agency.',
      }
    }
  }

  return { ok: true }
}

export function freeAgencyStillActive(league: LeagueState, currentDate: string): boolean {
  if (identifyFreeAgents(league).length > 0) return true
  return league.freeAgentOffers.some(
    (o) => o.status === 'pending' && currentDate <= o.matchDeadline,
  )
}

export interface AdvancePhaseResult {
  newPhase: LeaguePhase
  newsEvents: NewsEvent[]
  blocked?: boolean
  reason?: string
}

export async function advancePhase(
  league: LeagueState,
  userTeamId: string,
  rng: SeededRandom,
  snapshot?: StaticSnapshot,
): Promise<AdvancePhaseResult> {
  const guard = canAdvancePhase(league)
  if (!guard.ok) {
    return {
      newPhase: league.phase,
      newsEvents: [],
      blocked: true,
      reason: guard.reason,
    }
  }

  const currentIdx = PHASE_ORDER.indexOf(league.phase as typeof PHASE_ORDER[number])
  if (currentIdx < 0 || currentIdx >= PHASE_ORDER.length - 1) {
    return { newPhase: league.phase, newsEvents: [] }
  }

  const nextPhase = PHASE_ORDER[currentIdx + 1]!
  const newsEvents: NewsEvent[] = []

  if (nextPhase === 'draft') {
    const draftYear = upcomingDraftYear(league)
    let draftClass = getDraftClassForYear(league, draftYear)
    if (!draftClass) {
      const realData = await loadRealDraftData(draftYear)
      draftClass = generateDraftClass(draftYear, league.rules, realData, rng)
      league.draftClasses[draftClass.id] = draftClass
      initScoutingForDraftClass(league, draftClass.id)
    }
    const seasonLabel = formatSeasonLabel(draftYear)
    const orderSource = isModernLotteryEra(league.rules.seasonLabel) ? 'lottery' : 'inverse_record'
    const order =
      orderSource === 'lottery'
        ? runLottery(league, rng)
        : runInverseWLDraftOrder(league)
    assignPickNumbers(league, order, seasonLabel)
    const draft = startDraft(league, draftClass, order, orderSource)
    newsEvents.push(createLotteryNews(league, order))
    autoDraftOffClock(league, draft, userTeamId, rng)
  }

  if (nextPhase === 'free_agency') {
    signUnsignedRookies(league)
    const faIds = identifyFreeAgents(league)
    const aiOffers = submitAIOffers(league, faIds, league.currentDate, rng)
    league.freeAgentOffers.push(...aiOffers)
  }

  if (nextPhase === 'preseason') {
    resolvePreseasonFreeAgency(league, rng, newsEvents)
  }

  if (nextPhase === 'regular_season') {
    regenerateScheduleForNewSeason(league, snapshot, rng)
    league.rosterSizeCap = REGULAR_SEASON_ROSTER_CAP
    trimRostersToHardCap(league)
    newsEvents.push(createNewSeasonNews(league))
  }

  league.phase = nextPhase
  logOffseasonEvent(league, 'phase_advance', `Advanced to ${nextPhase}`, [])
  newsEvents.push({
    id: `news-phase-${nextPhase}-${Date.now()}`,
    date: league.currentDate,
    type: 'phase_advance',
    headline: `League enters ${formatPhaseLabel(nextPhase)}`,
    body: `The league has advanced to the ${formatPhaseLabel(nextPhase)} phase.`,
    teamIds: [],
    playerIds: [],
    importance: 'medium',
  })

  return { newPhase: nextPhase, newsEvents }
}

function resolvePreseasonFreeAgency(
  league: LeagueState,
  rng: SeededRandom,
  newsEvents: NewsEvent[],
): void {
  const maxDays = 60
  for (let day = 0; day < maxDays; day++) {
    if (!freeAgencyStillActive(league, league.currentDate)) break

    if (day > 0) {
      league.currentDate = addDays(league.currentDate, 1)
    }

    const faIds = identifyFreeAgents(league)
    if (faIds.length > 0) {
      const moreOffers = submitAIOffers(league, faIds, league.currentDate, rng)
      league.freeAgentOffers.push(...moreOffers)
    }

    const dayBatch = resolveDailyBatches(league, league.currentDate)
    newsEvents.push(...dayBatch.newsEvents)
  }
}

function signUnsignedRookies(league: LeagueState): void {
  for (const draft of Object.values(league.drafts)) {
    if (!draft || draft.status !== 'complete') continue
    for (const pick of draft.picks) {
      if (pick.signedAt) continue
      const team = league.teams[pick.pickedByTeamId]
      if (!team) continue
      const draftClass = league.draftClasses[draft.draftClassId]
      const prospect = draftClass?.prospects.find((p) => p.id === pick.prospectId)
      if (!prospect) continue

      const playerId = `player-${prospect.id}`
      const rookieContract = generateRookieContract(
        pick.pickNumber,
        pick.id,
        playerId,
        team.id,
        league.rules,
        pick.isTwoWay,
      )
      pick.signedAt = league.currentDate
      pick.rookieContractId = rookieContract.id

      const player = prospectToPlayer(prospect, team.id, rookieContract)
      league.players[player.id] = player
      if (!team.roster.includes(player.id)) team.roster.push(player.id)

      const salary = rookieContract.salaryByYear[0] ?? 0
      team.finances.payroll += salary
      team.finances.capSpace = league.rules.salaryCap - team.finances.payroll

      if (pick.isTwoWay) {
        if (!team.twoWayPlayers) team.twoWayPlayers = []
        team.twoWayPlayers.push(player.id)
      }
    }
  }
}

export function regenerateScheduleForNewSeason(
  league: LeagueState,
  _snapshot: StaticSnapshot | undefined,
  rng: SeededRandom,
): void {
  const nextYear = league.seasonYear + 1
  const seasonLabel = formatSeasonLabel(nextYear)
  league.seasonYear = nextYear
  league.rules = getLeagueRules(seasonLabel)
  league.eraConfig = getEraConfig(seasonLabel)
  league.games = {}
  league.playoffBracket = undefined

  const teams = Object.values(league.teams).filter(Boolean) as NonNullable<
    (typeof league.teams)[string]
  >[]
  league.standings = initializeStandings(teams, seasonLabel, league.rules.regularSeasonGames)
  league.scheduleGenerated = false

  const games = generateSchedule(teams, {
    startDate: league.currentDate,
    seasonYear: nextYear,
    seasonLabel,
    rng,
  })
  for (const g of games) {
    league.games[g.id] = g
    if (g.homeTeamId === league.userTeamId || g.awayTeamId === league.userTeamId) {
      g.isUserTeamGame = true
    }
  }
  league.scheduleGenerated = true

  for (const player of Object.values(league.players)) {
    if (!player) continue
    player.seasonStats = {
      season: seasonLabel,
      teamId: player.teamId,
      gamesPlayed: 0,
      minutes: 0,
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      turnovers: 0,
      fieldGoalsMade: 0,
      fieldGoalsAttempted: 0,
      threePointersMade: 0,
      threePointersAttempted: 0,
      freeThrowsMade: 0,
      freeThrowsAttempted: 0,
      plusMinus: 0,
    }
  }
}

function trimRostersToHardCap(league: LeagueState): void {
  for (const team of Object.values(league.teams)) {
    if (!team) continue
    while (team.roster.length > REGULAR_SEASON_ROSTER_CAP) {
      const cutCandidate = pickRosterCutCandidate(league, team)
      if (!cutCandidate) break
      releasePlayerFromTeam(league, team, cutCandidate)
    }
  }
}

function pickRosterCutCandidate(
  league: LeagueState,
  team: NonNullable<LeagueState['teams'][string]>,
): Player | null {
  const players = team.roster
    .map((id) => league.players[id])
    .filter((p): p is Player => !!p)

  if (players.length === 0) return null

  players.sort((a, b) => {
    const aTwoWay = team.twoWayPlayers?.includes(a.id) ? 0 : 1
    const bTwoWay = team.twoWayPlayers?.includes(b.id) ? 0 : 1
    if (aTwoWay !== bTwoWay) return aTwoWay - bTwoWay
    return a.ratings.overall - b.ratings.overall
  })

  return players[0] ?? null
}

function releasePlayerFromTeam(
  league: LeagueState,
  team: NonNullable<LeagueState['teams'][string]>,
  player: Player,
): void {
  team.roster = team.roster.filter((id) => id !== player.id)
  if (team.twoWayPlayers) {
    team.twoWayPlayers = team.twoWayPlayers.filter((id) => id !== player.id)
  }
  player.teamId = null

  const salary = player.contract.salaryByYear[0] ?? 0
  team.finances.payroll = Math.max(0, team.finances.payroll - salary)
  team.finances.capSpace = league.rules.salaryCap - team.finances.payroll
}

export function decideOption(
  league: LeagueState,
  playerId: string,
  accept: boolean,
  userTeamId: string,
  rng: SeededRandom,
): void {
  const player = league.players[playerId]
  if (!player) return
  const teamId = player.teamId
  if (!teamId) return

  const isUserTeam = teamId === userTeamId
  if (!isUserTeam) {
    accept = rng.chance(player.contract.option === 'player' ? 0.7 : 0.4)
  }

  if (!accept) {
    player.teamId = null
    const team = league.teams[teamId]
    if (team) team.roster = team.roster.filter((id) => id !== playerId)
    player.contract.yearsRemaining = 0
    return
  }

  if (player.contract.optionYear && player.contract.yearsRemaining > 0) {
    const optIdx = player.contract.optionYear - 1
    player.contract.yearsRemaining = optIdx + 1
    player.contract.option = 'none'
    player.contract.optionYear = null
  }
}

function logOffseasonEvent(
  league: LeagueState,
  type: OffseasonEvent['type'],
  headline: string,
  playerIds: string[],
): void {
  league.offseasonLog.push({
    id: `offseason-${type}-${Date.now()}`,
    date: league.currentDate,
    type,
    headline,
    body: headline,
    teamIds: [],
    playerIds,
  })
}

function createLotteryNews(
  league: LeagueState,
  order: { teamId: string; pickNumber: number }[],
): NewsEvent {
  const top = order[0]
  const team = top ? league.teams[top.teamId] : null
  const name = team ? `${team.city} ${team.name}` : 'Unknown'
  return {
    id: `news-lottery-${league.seasonYear}`,
    date: league.currentDate,
    type: 'lottery_result',
    headline: `${name} win the #1 pick`,
    body: `The draft lottery has been conducted. ${name} will pick first.`,
    teamIds: top ? [top.teamId] : [],
    playerIds: [],
    importance: 'high',
  }
}

function createNewSeasonNews(league: LeagueState): NewsEvent {
  return {
    id: `news-new-season-${league.seasonYear}`,
    date: league.currentDate,
    type: 'phase_advance',
    headline: `${league.rules.seasonLabel} season begins`,
    body: `A new NBA season is underway.`,
    teamIds: [],
    playerIds: [],
    importance: 'high',
  }
}

function formatPhaseLabel(phase: LeaguePhase): string {
  return phase.replace(/_/g, ' ')
}

export function getNextPhase(phase: LeaguePhase): LeaguePhase | null {
  const idx = PHASE_ORDER.indexOf(phase as typeof PHASE_ORDER[number])
  if (idx < 0 || idx >= PHASE_ORDER.length - 1) return null
  return PHASE_ORDER[idx + 1] ?? null
}

export function getPendingOptionCount(league: LeagueState, teamId: string): number {
  let count = 0
  for (const p of Object.values(league.players)) {
    if (!p || p.teamId !== teamId) continue
    if (p.contract.option !== 'none' && p.contract.yearsRemaining <= 1) count++
  }
  return count
}

export function getExpiringContractCount(league: LeagueState, teamId: string): number {
  let count = 0
  for (const p of Object.values(league.players)) {
    if (!p || p.teamId !== teamId) continue
    if (p.contract.yearsRemaining <= 1) count++
  }
  return count
}
