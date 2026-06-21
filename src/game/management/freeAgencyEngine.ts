import type { LeagueState } from '@/game/models/league'
import type { Player } from '@/game/models/player'
import type {
  FreeAgentOffer,
  FreeAgentOfferInput,
  BirdRightsType,
  QualifyingOffer,
} from '@/game/models/freeAgent'
import type { CompensationPick } from '@/game/models/compensationPick'
import type { NewsEvent } from '@/game/models/news'
import type { Team } from '@/game/models/team'
import { createContract } from '@/game/models/contract'
import { addDays } from '@/lib/utils'

export const RFA_MATCH_DAYS = 7
const COMP_STANDARD_THRESHOLD_M = 15_000_000

export function identifyFreeAgents(league: LeagueState): string[] {
  return Object.values(league.players)
    .filter((p) => p?.teamId === null && p.contract.yearsRemaining <= 0)
    .map((p) => p.id)
}

export function identifyRestrictedFreeAgents(
  league: LeagueState,
  qualifyingOffers: QualifyingOffer[],
): string[] {
  const qoPlayers = new Set(qualifyingOffers.map((q) => q.playerId))
  return Object.values(league.players)
    .filter(
      (p) =>
        p?.teamId === null &&
        p.contract.yearsRemaining <= 0 &&
        qoPlayers.has(p.id),
    )
    .map((p) => p.id)
}

export function yearsWithTeam(player: Player, teamId: string): number {
  const seasons = player.careerStats?.filter((s) => s.teamId === teamId) ?? []
  return seasons.length
}

export function identifyBirdRights(
  _league: LeagueState,
  player: Player,
  teamId: string,
): BirdRightsType {
  if (player.teamId !== null && player.teamId !== teamId) return 'non_bird'
  const years = yearsWithTeam(player, teamId)
  if (years >= 4 || player.contract.birdRights) return 'bird'
  if (years >= 2 || player.contract.earlyBird) return 'early_bird'
  return 'non_bird'
}

export function computeInterestScore(
  offer: FreeAgentOffer,
  player: Player,
  team: Team,
  askingSalary: number,
): number {
  const salaryNorm = Math.min(1, (offer.salaryByYear[0] ?? 0) / Math.max(1, askingSalary))
  const role = team.roster.length < 12 ? 0.9 : team.roster.length < 15 ? 0.7 : 0.4
  const prestige = (team.prestige ?? 50) / 100
  const winNow =
    team.direction === 'contender' ? 1 :
    team.direction === 'playoff_push' ? 0.75 :
    team.direction === 'rebuilding' ? 0.3 : 0.5
  const loyalty = (player.traits.loyalty ?? 50) / 100
  const tax = 0.05

  return (
    salaryNorm * 0.4 +
    role * 0.2 +
    prestige * 0.15 +
    winNow * 0.15 +
    loyalty * 0.1 -
    tax * 0.1
  )
}

export function computeAskingSalary(player: Player, rules: { salaryCap: number }): number {
  const ovr = player.ratings.overall
  const base = (ovr / 100) * rules.salaryCap * 0.25
  return Math.round(Math.max(rules.salaryCap * 0.02, base))
}

export function validateFreeAgentOffer(
  league: LeagueState,
  teamId: string,
  playerId: string,
  offer: FreeAgentOfferInput,
): { ok: true } | { ok: false; reason: string } {
  const team = league.teams[teamId]
  const player = league.players[playerId]
  if (!team || !player) return { ok: false, reason: 'Invalid player or team.' }
  if (player.teamId !== null) return { ok: false, reason: 'Player is not a free agent.' }

  const cap = league.rosterSizeCap ?? 20
  if (team.roster.length >= cap) {
    return { ok: false, reason: `Roster full (${cap} players).` }
  }

  const firstYear = offer.salaryByYear[0] ?? 0
  if (team.finances.capSpace < firstYear) {
    return { ok: false, reason: 'Insufficient cap space for year-one salary.' }
  }

  return { ok: true }
}

export function submitOffer(
  offer: FreeAgentOfferInput,
  playerId: string,
  teamId: string,
  _player: Player,
  currentDate: string,
  isRFA: boolean,
): FreeAgentOffer {
  return {
    id: `offer-${playerId}-${teamId}-${Date.now()}`,
    playerId,
    teamId,
    years: offer.years,
    salaryByYear: offer.salaryByYear,
    exceptionUsed: offer.exceptionUsed,
    offeredAt: currentDate,
    status: 'pending',
    matchDeadline: isRFA ? addDays(currentDate, RFA_MATCH_DAYS) : currentDate,
  }
}

export function matchOfferSheet(
  offer: FreeAgentOffer,
  originalTeam: Team,
  originalTeamId: string,
  currentDate: string,
  _player: Player,
): { matched: boolean; reason?: string } {
  if (currentDate > offer.matchDeadline) {
    return { matched: false, reason: 'Match deadline has passed.' }
  }
  const bird = identifyBirdRights(
    { players: { [_player.id]: _player } } as LeagueState,
    _player,
    originalTeamId,
  )
  if (bird === 'non_bird' && originalTeam.finances.capSpace < (offer.salaryByYear[0] ?? 0)) {
    return { matched: false, reason: 'Cannot afford to match without bird rights.' }
  }
  return { matched: true }
}

export function signPlayerFromOffer(
  league: LeagueState,
  offer: FreeAgentOffer,
  player: Player,
): void {
  const team = league.teams[offer.teamId]
  if (!team) return

  player.teamId = offer.teamId
  player.contract = createContract({
    salaryByYear: offer.salaryByYear,
    yearsRemaining: offer.years,
    birdRights: false,
    earlyBird: false,
    guaranteed: true,
    guaranteedByYear: offer.salaryByYear.map(() => true),
  })

  if (!team.roster.includes(player.id)) {
    team.roster.push(player.id)
  }

  const payroll = team.finances.payroll + (offer.salaryByYear[0] ?? 0)
  team.finances.payroll = payroll
  team.finances.capSpace = league.rules.salaryCap - payroll

  if (offer.exceptionUsed === 'mle') team.finances.exceptionsUsed.mle = true
  if (offer.exceptionUsed === 'bae') team.finances.exceptionsUsed.bae = true
  if (offer.exceptionUsed === 'room_mle') team.finances.exceptionsUsed.roomMle = true
  if (offer.exceptionUsed === 'minimum') {
    team.finances.exceptionsUsed.minimumCount += 1
  }

  if (offer.status === 'pending') {
    offer.status = 'accepted'
  }
}

export interface DailyBatchResult {
  resolvedOffers: FreeAgentOffer[]
  newsEvents: NewsEvent[]
}

export function resolveDailyBatches(
  league: LeagueState,
  currentDate: string,
): DailyBatchResult {
  const resolvedOffers: FreeAgentOffer[] = []
  const newsEvents: NewsEvent[] = []

  const pendingByPlayer = new Map<string, FreeAgentOffer[]>()
  for (const offer of league.freeAgentOffers) {
    if (offer.status !== 'pending') continue
    const list = pendingByPlayer.get(offer.playerId) ?? []
    list.push(offer)
    pendingByPlayer.set(offer.playerId, list)
  }

  for (const [playerId, offers] of pendingByPlayer) {
    const player = league.players[playerId]
    if (!player) continue

    const asking = computeAskingSalary(player, league.rules)
    let best: FreeAgentOffer | null = null
    let bestScore = -1

    for (const offer of offers) {
      const team = league.teams[offer.teamId]
      if (!team) continue
      const score = computeInterestScore(offer, player, team, asking)
      if (score > bestScore) {
        bestScore = score
        best = offer
      }
    }

    if (!best) continue

    const isRFA = league.qualifyingOffers.some((q) => q.playerId === playerId)
    if (isRFA && currentDate <= best.matchDeadline) {
      const qo = league.qualifyingOffers.find((q) => q.playerId === playerId)
      if (qo) {
        const origTeam = league.teams[qo.teamId]
        if (origTeam && origTeam.id !== best.teamId) {
          const match = matchOfferSheet(best, origTeam, qo.teamId, currentDate, player)
          if (match.matched) {
            best.matchedByTeamId = qo.teamId
            best.status = 'matched'
            signPlayerFromOffer(league, { ...best, teamId: qo.teamId }, player)
            resolvedOffers.push(best)
            for (const o of offers) {
              if (o.id !== best.id && o.status === 'pending') o.status = 'rejected'
            }
            newsEvents.push(createSigningNews(league, player, qo.teamId, true))
            continue
          }
        }
      }
    }

    if (currentDate >= best.matchDeadline || !isRFA) {
      signPlayerFromOffer(league, best, player)
      resolvedOffers.push(best)
      for (const o of offers) {
        if (o.id !== best.id && o.status === 'pending') o.status = 'rejected'
      }
      newsEvents.push(createSigningNews(league, player, best.teamId, false))
    }
  }

  for (const offer of league.freeAgentOffers) {
    if (offer.status === 'pending' && currentDate > offer.matchDeadline) {
      offer.status = 'expired'
      resolvedOffers.push(offer)
    }
  }

  return { resolvedOffers, newsEvents }
}

function createSigningNews(
  league: LeagueState,
  player: Player,
  teamId: string,
  matched: boolean,
): NewsEvent {
  const team = league.teams[teamId]
  const teamName = team ? `${team.city} ${team.name}` : teamId
  const playerName = `${player.firstName} ${player.lastName}`
  return {
    id: `news-signing-${player.id}-${Date.now()}`,
    date: league.currentDate,
    type: matched ? 'offer_sheet_matched' : 'signing',
    headline: matched
      ? `${teamName} match offer sheet for ${playerName}`
      : `${playerName} signs with ${teamName}`,
    body: matched
      ? `${teamName} matched the offer sheet and retained ${playerName}.`
      : `${playerName} has signed with ${teamName}.`,
    teamIds: [teamId],
    playerIds: [player.id],
    importance: 'medium',
  }
}

export function generateCompensationPicks(
  _league: LeagueState,
  outgoingFAs: { playerId: string; teamId: string; salary: number }[],
  seasonYear: number,
): CompensationPick[] {
  const picks: CompensationPick[] = []
  for (const fa of outgoingFAs) {
    if (fa.salary <= 0) continue
    const threshold: CompensationPick['threshold'] =
      fa.salary > COMP_STANDARD_THRESHOLD_M ? 'high_value' : 'standard'
    const count = threshold === 'high_value' ? 2 : 1
    for (let i = 0; i < count; i++) {
      picks.push({
        id: `comp-${fa.teamId}-${fa.playerId}-${i}`,
        seasonYear: seasonYear + 1,
        round: 2,
        originalTeamId: fa.teamId,
        currentTeamId: fa.teamId,
        reason: 'outgoing_free_agent',
        amount: fa.salary,
        threshold,
        playerId: fa.playerId,
      })
    }
  }
  return picks
}

export function generateQualifyingOffers(
  league: LeagueState,
  rfaPlayers: { playerId: string; teamId: string }[],
  currentDate: string,
): QualifyingOffer[] {
  return rfaPlayers.map(({ playerId, teamId }) => {
    const player = league.players[playerId]
    const lastSalary = player?.contract.salaryByYear[0] ?? league.rules.minimumPlayerSalary
    const amount = Math.round(lastSalary * 1.1)
    return {
      id: `qo-${playerId}-${teamId}`,
      playerId,
      teamId,
      amount,
      years: 1,
      expiresAt: addDays(currentDate, 30),
    }
  })
}

export function expireContracts(league: LeagueState): string[] {
  const expired: string[] = []
  for (const player of Object.values(league.players)) {
    if (!player) continue
    if (player.contract.yearsRemaining <= 0 && player.teamId) {
      const team = league.teams[player.teamId]
      if (team) {
        team.roster = team.roster.filter((id) => id !== player.id)
        if (team.twoWayPlayers) {
          team.twoWayPlayers = team.twoWayPlayers.filter((id) => id !== player.id)
        }
      }
      player.teamId = null
      expired.push(player.id)
    }
  }
  return expired
}

export function submitAIOffers(
  league: LeagueState,
  freeAgentIds: string[],
  currentDate: string,
  rng: { nextInt: (min: number, max: number) => number },
): FreeAgentOffer[] {
  const offers: FreeAgentOffer[] = []
  const teams = Object.values(league.teams).filter((t) => t && t.id !== league.userTeamId)

  for (const playerId of freeAgentIds) {
    const player = league.players[playerId]
    if (!player) continue
    const asking = computeAskingSalary(player, league.rules)
    const shuffled = [...teams].sort(() => rng.nextInt(0, 1) - 0.5)
    const bidders = shuffled.slice(0, rng.nextInt(1, 3))

    for (const team of bidders) {
      if (!team || team.roster.length >= league.rosterSizeCap) continue
      const years = rng.nextInt(1, 3)
      const salary = Math.round(asking * (0.85 + rng.nextInt(0, 30) / 100))
      const isRFA = league.qualifyingOffers.some((q) => q.playerId === playerId)
      offers.push(
        submitOffer(
          { years, salaryByYear: Array.from({ length: years }, () => salary) },
          playerId,
          team.id,
          player,
          currentDate,
          isRFA,
        ),
      )
    }
  }
  return offers
}

/** After preseason FA sim: sign stragglers at minimum or mark as sat out for the season. */
export function finalizeStrandedFreeAgents(
  league: LeagueState,
  rng: { nextInt: (min: number, max: number) => number },
): void {
  for (const offer of league.freeAgentOffers) {
    if (offer.status === 'pending') {
      offer.status = 'expired'
    }
  }

  const minSalary = league.rules.minimumPlayerSalary
  const rosterCap = league.rosterSizeCap ?? 20

  let faIds = identifyFreeAgents(league)
  while (faIds.length > 0) {
    let placedAny = false

    for (const playerId of faIds) {
      const player = league.players[playerId]
      if (player?.teamId !== null) continue

      const candidates = Object.values(league.teams)
        .filter(
          (t): t is Team =>
            !!t &&
            t.roster.length < rosterCap &&
            t.finances.capSpace >= minSalary,
        )
        .sort((a, b) => b.finances.capSpace - a.finances.capSpace)

      const team = candidates[rng.nextInt(0, Math.max(0, candidates.length - 1))]
      if (!team) {
        markPlayerSatOutForSeason(player)
        placedAny = true
        continue
      }

      const offer = submitOffer(
        { years: 1, salaryByYear: [minSalary] },
        playerId,
        team.id,
        player,
        league.currentDate,
        false,
      )
      signPlayerFromOffer(league, offer, player)
      placedAny = true
    }

    const remaining = identifyFreeAgents(league)
    if (!placedAny && remaining.length === faIds.length) {
      for (const playerId of remaining) {
        const player = league.players[playerId]
        if (player) markPlayerSatOutForSeason(player)
      }
      break
    }
    faIds = remaining
  }
}

function markPlayerSatOutForSeason(player: Player): void {
  player.contract = createContract({
    salaryByYear: [0],
    yearsRemaining: 1,
    birdRights: false,
    earlyBird: false,
    guaranteed: true,
    guaranteedByYear: [true],
    option: 'none',
    optionYear: null,
  })
}
