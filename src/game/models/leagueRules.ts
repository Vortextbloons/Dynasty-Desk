export interface LeagueRules {
  seasonLabel: string
  teamCount: number
  regularSeasonGames: number
  playoffTeamsPerConference: number
  playoffSeriesLength: 1 | 3 | 5 | 7
  salaryCapEnabled: boolean
  salaryCap: number
  luxuryTaxEnabled: boolean
  maxRosterSize: number
  minRosterSize: number
  maxContractYears: number
  draftRounds: number
  threePointLineDistance: number
  playoffFormat: 'top8' | 'playin_then_top8' | 'top6_playin_7_10'
  hasPlayIn: boolean

  apron: number
  secondApron: number
  luxuryTaxLine: number
  luxuryTaxRates: { nonTaxpayer: number; taxpayer: number; repeater: number }
  secondApronTaxRate: number
  apronPenaltyPerMillion: number

  midLevelException: number
  biAnnualException: number
  roomMle: number
  minimumPlayerSalary: number
  minimumTeamSalary: number
  tradeExceptionYears: number
  allowCashInTrades: boolean

  twoWaySlots: number
  rookieScale: 'real' | 'flat'
  rookieDealYears: number
  rookieOptionYears: number
}

export const DEFAULT_LEAGUE_RULES: LeagueRules = {
  seasonLabel: '2025-26',
  teamCount: 30,
  regularSeasonGames: 82,
  playoffTeamsPerConference: 8,
  playoffSeriesLength: 7,
  salaryCapEnabled: true,
  salaryCap: 140_588_000,
  luxuryTaxEnabled: true,
  maxRosterSize: 15,
  minRosterSize: 13,
  maxContractYears: 5,
  draftRounds: 2,
  threePointLineDistance: 23.75,
  playoffFormat: 'playin_then_top8',
  hasPlayIn: true,

  apron: 178_132_000,
  secondApron: 189_502_000,
  luxuryTaxLine: 171_314_000,
  luxuryTaxRates: { nonTaxpayer: 1.5, taxpayer: 1.75, repeater: 2.5 },
  secondApronTaxRate: 3.75,
  apronPenaltyPerMillion: 1_000_000,

  midLevelException: 12_800_000,
  biAnnualException: 4_600_000,
  roomMle: 7_700_000,
  minimumPlayerSalary: 1_100_000,
  minimumTeamSalary: 126_529_200,
  tradeExceptionYears: 1,
  allowCashInTrades: true,

  twoWaySlots: 2,
  rookieScale: 'real',
  rookieDealYears: 4,
  rookieOptionYears: 2,
}

export const HISTORICAL_LEAGUE_RULES: Readonly<
  Record<string, Partial<LeagueRules>>
> = {
  '1990-91': {
    regularSeasonGames: 82,
    hasPlayIn: false,
    playoffFormat: 'top8',
    threePointLineDistance: 23.0,
  },
  '1991-92': {
    regularSeasonGames: 82,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '1992-93': {
    regularSeasonGames: 82,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '1993-94': {
    regularSeasonGames: 82,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '1994-95': {
    regularSeasonGames: 82,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '1995-96': {
    regularSeasonGames: 82,
    hasPlayIn: false,
    playoffFormat: 'top8',
    threePointLineDistance: 22.0,
  },
  '1996-97': {
    regularSeasonGames: 82,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '1997-98': {
    regularSeasonGames: 82,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '1998-99': {
    regularSeasonGames: 50,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '1999-00': {
    regularSeasonGames: 82,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '2000-01': {
    regularSeasonGames: 82,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '2001-02': {
    regularSeasonGames: 82,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '2002-03': {
    regularSeasonGames: 82,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '2003-04': {
    regularSeasonGames: 82,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '2004-05': {
    regularSeasonGames: 82,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '2005-06': {
    regularSeasonGames: 82,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '2006-07': {
    regularSeasonGames: 82,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '2007-08': {
    regularSeasonGames: 82,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '2008-09': {
    regularSeasonGames: 82,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '2009-10': {
    regularSeasonGames: 82,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '2010-11': {
    regularSeasonGames: 82,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '2011-12': {
    regularSeasonGames: 66,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '2012-13': {
    regularSeasonGames: 82,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '2013-14': {
    regularSeasonGames: 82,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '2014-15': {
    regularSeasonGames: 82,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '2015-16': {
    regularSeasonGames: 82,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '2016-17': {
    regularSeasonGames: 82,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '2017-18': {
    regularSeasonGames: 82,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '2018-19': {
    regularSeasonGames: 82,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '2019-20': {
    regularSeasonGames: 75,
    hasPlayIn: false,
    playoffFormat: 'top8',
  },
  '2020-21': {
    regularSeasonGames: 72,
    hasPlayIn: true,
    playoffFormat: 'playin_then_top8',
  },
  '2021-22': {
    regularSeasonGames: 82,
    hasPlayIn: true,
    playoffFormat: 'playin_then_top8',
  },
  '2022-23': {
    regularSeasonGames: 82,
    hasPlayIn: true,
    playoffFormat: 'playin_then_top8',
  },
  '2023-24': {
    regularSeasonGames: 82,
    hasPlayIn: true,
    playoffFormat: 'playin_then_top8',
  },
  '2024-25': {
    regularSeasonGames: 82,
    hasPlayIn: true,
    playoffFormat: 'playin_then_top8',
  },
  '2025-26': {
    regularSeasonGames: 82,
    hasPlayIn: true,
    playoffFormat: 'playin_then_top8',
  },
}

export function getLeagueRules(season: string): LeagueRules {
  const overrides = HISTORICAL_LEAGUE_RULES[season] ?? {}
  return { ...DEFAULT_LEAGUE_RULES, ...overrides, seasonLabel: season }
}
