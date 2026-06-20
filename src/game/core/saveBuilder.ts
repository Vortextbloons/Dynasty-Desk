import type {
  GameSave,
  GameSettings,
  LeagueState,
  NewsEvent,
  SaveMetadata,
  StaticSnapshot,
  TeamStanding,
} from '@/game/models'
import { seasonOpeningNight } from './seasonCalendar'
import { createRngState } from './seededRandom'
import { computeCapHit } from '@/game/management/capEngine'
import { computeOverall } from '@/game/ratings/overallWeights'
import { generateAutoRotation } from '@/game/management/autoRotation'

export interface NewSaveInput {
  snapshot: StaticSnapshot
  teamId: string
  leagueName: string
  managerName: string
  settings: GameSettings
}

export function buildSave(input: NewSaveInput): GameSave {
  const { snapshot, teamId, leagueName, managerName, settings } = input

  const saveId = crypto.randomUUID()
  const leagueId = crypto.randomUUID()
  const now = new Date().toISOString()

  const teams: LeagueState['teams'] = {}
  for (const st of snapshot.teams) {
    teams[st.id] = {
      id: st.id,
      city: st.city,
      name: st.name,
      abbreviation: st.abbreviation,
      conference: st.conference,
      division: st.division,
      colors: { primary: st.colors.primary, secondary: st.colors.secondary },
      roster: [],
      lineup: {
        starters: [],
        bench: [],
        closingLineup: [],
        targetMinutes: {},
        autoRotation: true,
      },
      strategy: {
        offense: {
          pace: 'balanced',
          shotProfile: 'balanced',
          primaryAction: 'pick_and_roll',
          usageDistribution: 'balanced',
          crashOffensiveGlass: 'medium',
        },
        defense: {
          pickAndRollCoverage: 'drop',
          helpDefense: 'balanced',
          pressure: 'medium',
          reboundingFocus: 'balanced',
          physicality: 'balanced',
        },
      },
      finances: {
        salaryCap: snapshot.rules.salaryCap,
        apron: snapshot.rules.apron,
        secondApron: snapshot.rules.secondApron,
        luxuryTaxLine: snapshot.rules.luxuryTaxLine,
        payroll: 0,
        capSpace: snapshot.rules.salaryCap,
        taxBill: 0,
        projectedTaxBill: 0,

        baseRevenue: 0,
        localRevenue: 0,
        seasonPerformanceBonus: 0,
        totalRevenue: 0,

        operatingExpenses: 10_000_000,
        totalExpenses: 10_000_000,
        netIncome: 0,

        ownerCash: st.owner?.cash ?? 50_000_000,
        cashReserves: 100_000_000,
        ownerPatience: 70,

        exceptionsUsed: {
          mle: false,
          bae: false,
          roomMle: false,
          minimumCount: 0,
        },
      },
      direction: 'middle',
      chemistry: 50,
      morale: 50,
      prestige: st.prestige,
      owner: st.owner,
    }
  }

  const players: LeagueState['players'] = {}
  for (const sp of snapshot.players) {
    const overall = sp.ratings.overall ?? computeOverall(sp.ratings, sp.position)
    const happiness = 75

    players[sp.id] = {
      id: sp.id,
      externalId: sp.externalId,
      firstName: sp.firstName,
      lastName: sp.lastName,
      age: sp.age,
      position: sp.position,
      secondaryPositions: sp.secondaryPositions,
      heightInches: sp.heightInches,
      weightLbs: sp.weightLbs,
      teamId: sp.teamId,
      ratings: { ...sp.ratings, overall },
      tendencies: sp.tendencies,
      traits: sp.traits,
      contract: sp.contract,
      morale: {
        level: happiness,
        happiness,
        roleSatisfaction: 75,
        teamSatisfaction: happiness,
        tradeRequest: false,
        tradeRequestLevel: 0,
      },
      health: {
        status: 'healthy',
        injuryDescription: null,
        daysRemaining: 0,
        gamesRemaining: 0,
      },
      development: {
        lastTrainedAt: null,
        focusArea: null,
        recentForm: 50,
        ageAtPeak: 27,
        progressionCurve: 'normal',
        ratingsDelta: {},
        breakoutChance: 0.1,
        bustRisk: 0.1,
      },
      seasonStats: {
        season: snapshot.seasonLabel,
        teamId: sp.teamId,
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
      },
      careerStats: [],
      historicalSeasons: snapshot.seasonStats.filter(
        (s) => s.playerId === sp.id,
      ),
    }

    const team = sp.teamId ? teams[sp.teamId] : undefined
    if (team) {
      team.roster.push(sp.id)
    }
  }

  for (const teamId of Object.keys(teams)) {
    const team = teams[teamId]
    if (!team) continue
    const roster = team.roster

    const rosterPlayerMap = new Map(
      roster
        .map((pid) => players[pid])
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((p) => [p.id, p]),
    )
    team.lineup = generateAutoRotation(roster, rosterPlayerMap)

    let payroll = 0
    for (const pid of team.roster) {
      const player = players[pid]
      if (player) {
        payroll += computeCapHit(player, snapshot.rules)
      }
    }
    team.finances.payroll = payroll
    team.finances.capSpace = snapshot.rules.salaryCap - payroll
  }

  const standings: LeagueState['standings'] = {}
  for (const st of snapshot.teams) {
    standings[st.id] = {
      teamId: st.id,
      season: snapshot.seasonLabel,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      winPct: 0,
      homeWins: 0,
      homeLosses: 0,
      awayWins: 0,
      awayLosses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDifferential: 0,
      conferenceRank: 0,
      divisionRank: 0,
      streak: 0,
      last10: '',
      clinchedPlayoff: false,
      clinchedDivision: false,
      eliminated: false,
    }
  }

  const welcomeNews: NewsEvent = {
    id: crypto.randomUUID(),
    date: seasonOpeningNight(snapshot.seasonLabel),
    type: 'championship',
    headline: `${leagueName} — Season begins`,
    body: `Welcome to ${leagueName}. You are the GM of the ${
      snapshot.teams.find((t) => t.id === teamId)?.name ?? teamId
    }. The ${snapshot.seasonLabel} NBA season is about to begin.`,
    teamIds: [teamId],
    playerIds: [],
    importance: 'high',
  }

  const league: LeagueState = {
    id: leagueId,
    name: leagueName,
    currentDate: seasonOpeningNight(snapshot.seasonLabel),
    seasonYear: snapshot.startYear,
    phase: 'regular_season',
    rules: snapshot.rules,
    eraConfig: snapshot.eraConfig,
    snapshotId: snapshot.id,
    teams,
    players,
    games: {},
    standings,
    transactions: [],
    news: [welcomeNews],
    awardsHistory: [],
    draftPicks: [],
    draftClasses: {},
    champions: snapshot.champions,
    awards: snapshot.awards,
    userTeamId: teamId,
  }

  const metadata: SaveMetadata = {
    id: saveId,
    name: leagueName,
    createdAt: now,
    updatedAt: now,
    appVersion: '0.1.0',
    schemaVersion: 3,
    teamId,
    teamName:
      snapshot.teams.find((t) => t.id === teamId)?.name ?? teamId,
    currentSeason: snapshot.startYear,
    currentDate: league.currentDate,
    leagueName,
    snapshotId: snapshot.id,
  }

  return {
    metadata,
    league,
    user: { managerName, teamId },
    settings,
    rngState: createRngState(),
  }
}

export function initStanding(
  teamId: string,
  season: string,
): TeamStanding {
  return {
    teamId,
    season,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    winPct: 0,
    homeWins: 0,
    homeLosses: 0,
    awayWins: 0,
    awayLosses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    pointDifferential: 0,
    conferenceRank: 0,
    divisionRank: 0,
    streak: 0,
    last10: '',
    clinchedPlayoff: false,
    clinchedDivision: false,
    eliminated: false,
  }
}
