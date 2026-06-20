// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { generateSchedule } from '@/game/league/scheduleGenerator'
import { makeTeam } from '@/tests/fixtures'
import { SeededRandom } from '@/game/sim/rng'

const TEAMS = [
  makeTeam({ id: 'bos', city: 'Boston', name: 'Celtics', abbreviation: 'BOS', conference: 'East', division: 'Atlantic' }),
  makeTeam({ id: 'nyk', city: 'New York', name: 'Knicks', abbreviation: 'NYK', conference: 'East', division: 'Atlantic' }),
  makeTeam({ id: 'phi', city: 'Philadelphia', name: '76ers', abbreviation: 'PHI', conference: 'East', division: 'Atlantic' }),
  makeTeam({ id: 'brk', city: 'Brooklyn', name: 'Nets', abbreviation: 'BKN', conference: 'East', division: 'Atlantic' }),
  makeTeam({ id: 'tor', city: 'Toronto', name: 'Raptors', abbreviation: 'TOR', conference: 'East', division: 'Atlantic' }),
  makeTeam({ id: 'cle', city: 'Cleveland', name: 'Cavaliers', abbreviation: 'CLE', conference: 'East', division: 'Central' }),
  makeTeam({ id: 'mil', city: 'Milwaukee', name: 'Bucks', abbreviation: 'MIL', conference: 'East', division: 'Central' }),
  makeTeam({ id: 'chi', city: 'Chicago', name: 'Bulls', abbreviation: 'CHI', conference: 'East', division: 'Central' }),
  makeTeam({ id: 'det', city: 'Detroit', name: 'Pistons', abbreviation: 'DET', conference: 'East', division: 'Central' }),
  makeTeam({ id: 'ind', city: 'Indiana', name: 'Pacers', abbreviation: 'IND', conference: 'East', division: 'Central' }),
  makeTeam({ id: 'mia', city: 'Miami', name: 'Heat', abbreviation: 'MIA', conference: 'East', division: 'Southeast' }),
  makeTeam({ id: 'atl', city: 'Atlanta', name: 'Hawks', abbreviation: 'ATL', conference: 'East', division: 'Southeast' }),
  makeTeam({ id: 'orl', city: 'Orlando', name: 'Magic', abbreviation: 'ORL', conference: 'East', division: 'Southeast' }),
  makeTeam({ id: 'was', city: 'Washington', name: 'Wizards', abbreviation: 'WAS', conference: 'East', division: 'Southeast' }),
  makeTeam({ id: 'cha', city: 'Charlotte', name: 'Hornets', abbreviation: 'CHA', conference: 'East', division: 'Southeast' }),
  makeTeam({ id: 'den', city: 'Denver', name: 'Nuggets', abbreviation: 'DEN', conference: 'West', division: 'Northwest' }),
  makeTeam({ id: 'okc', city: 'Oklahoma City', name: 'Thunder', abbreviation: 'OKC', conference: 'West', division: 'Northwest' }),
  makeTeam({ id: 'min', city: 'Minnesota', name: 'Timberwolves', abbreviation: 'MIN', conference: 'West', division: 'Northwest' }),
  makeTeam({ id: 'por', city: 'Portland', name: 'Trail Blazers', abbreviation: 'POR', conference: 'West', division: 'Northwest' }),
  makeTeam({ id: 'uta', city: 'Utah', name: 'Jazz', abbreviation: 'UTA', conference: 'West', division: 'Northwest' }),
  makeTeam({ id: 'lal', city: 'Los Angeles', name: 'Lakers', abbreviation: 'LAL', conference: 'West', division: 'Pacific' }),
  makeTeam({ id: 'lac', city: 'Los Angeles', name: 'Clippers', abbreviation: 'LAC', conference: 'West', division: 'Pacific' }),
  makeTeam({ id: 'phx', city: 'Phoenix', name: 'Suns', abbreviation: 'PHX', conference: 'West', division: 'Pacific' }),
  makeTeam({ id: 'sac', city: 'Sacramento', name: 'Kings', abbreviation: 'SAC', conference: 'West', division: 'Pacific' }),
  makeTeam({ id: 'gsw', city: 'Golden State', name: 'Warriors', abbreviation: 'GSW', conference: 'West', division: 'Pacific' }),
  makeTeam({ id: 'dal', city: 'Dallas', name: 'Mavericks', abbreviation: 'DAL', conference: 'West', division: 'Southwest' }),
  makeTeam({ id: 'hou', city: 'Houston', name: 'Rockets', abbreviation: 'HOU', conference: 'West', division: 'Southwest' }),
  makeTeam({ id: 'mem', city: 'Memphis', name: 'Grizzlies', abbreviation: 'MEM', conference: 'West', division: 'Southwest' }),
  makeTeam({ id: 'nop', city: 'New Orleans', name: 'Pelicans', abbreviation: 'NOP', conference: 'West', division: 'Southwest' }),
  makeTeam({ id: 'sas', city: 'San Antonio', name: 'Spurs', abbreviation: 'SAS', conference: 'West', division: 'Southwest' }),
]

describe('generateSchedule', () => {
  const games = generateSchedule(TEAMS, {
    startDate: '2025-10-21',
    seasonYear: 2025,
    seasonLabel: '2025-26',
    rng: new SeededRandom({ seed: 'test-schedule', position: 0 }),
  })

  it('generates exactly 1230 games for 30 teams', () => {
    expect(games).toHaveLength(1230)
  })

  it('each team plays exactly 82 games', () => {
    const teamGameCounts = new Map<string, number>()
    for (const game of games) {
      teamGameCounts.set(game.homeTeamId, (teamGameCounts.get(game.homeTeamId) ?? 0) + 1)
      teamGameCounts.set(game.awayTeamId, (teamGameCounts.get(game.awayTeamId) ?? 0) + 1)
    }
    for (const team of TEAMS) {
      expect(teamGameCounts.get(team.id)).toBe(82)
    }
  })

  it('no team plays twice on the same day', () => {
    const teamDates = new Map<string, Set<string>>()
    for (const game of games) {
      const homeDates = teamDates.get(game.homeTeamId) ?? new Set<string>()
      const awayDates = teamDates.get(game.awayTeamId) ?? new Set<string>()
      expect(homeDates.has(game.date)).toBe(false)
      expect(awayDates.has(game.date)).toBe(false)
      homeDates.add(game.date)
      awayDates.add(game.date)
      teamDates.set(game.homeTeamId, homeDates)
      teamDates.set(game.awayTeamId, awayDates)
    }
  })

  it('each team plays ~41 home and ~41 away', () => {
    const homeCounts = new Map<string, number>()
    const awayCounts = new Map<string, number>()
    for (const game of games) {
      homeCounts.set(game.homeTeamId, (homeCounts.get(game.homeTeamId) ?? 0) + 1)
      awayCounts.set(game.awayTeamId, (awayCounts.get(game.awayTeamId) ?? 0) + 1)
    }
    for (const team of TEAMS) {
      const home = homeCounts.get(team.id) ?? 0
      const away = awayCounts.get(team.id) ?? 0
      expect(home).toBeGreaterThanOrEqual(39)
      expect(home).toBeLessThanOrEqual(43)
      expect(away).toBeGreaterThanOrEqual(39)
      expect(away).toBeLessThanOrEqual(43)
    }
  })

  it('all games fit within 170 days', () => {
    const startDate = new Date('2025-10-21').getTime()
    const maxDate = new Date('2026-04-08').getTime()
    for (const game of games) {
      const gameDate = new Date(game.date).getTime()
      expect(gameDate).toBeGreaterThanOrEqual(startDate)
      expect(gameDate).toBeLessThanOrEqual(maxDate)
    }
  })

  it('each team plays 4x division rivals', () => {
    const divisionMatchups = new Map<string, number>()
    for (const game of games) {
      const homeTeam = TEAMS.find((t) => t.id === game.homeTeamId)
      const awayTeam = TEAMS.find((t) => t.id === game.awayTeamId)
      if (homeTeam && awayTeam && homeTeam.conference === awayTeam.conference && homeTeam.division === awayTeam.division) {
        const key = [homeTeam.id, awayTeam.id].sort().join('-')
        divisionMatchups.set(key, (divisionMatchups.get(key) ?? 0) + 1)
      }
    }
    for (const count of divisionMatchups.values()) {
      expect(count).toBe(4)
    }
  })

  it('each team plays >=2x conference opponents', () => {
    const confMatchups = new Map<string, number>()
    for (const game of games) {
      const homeTeam = TEAMS.find((t) => t.id === game.homeTeamId)
      const awayTeam = TEAMS.find((t) => t.id === game.awayTeamId)
      if (homeTeam && awayTeam && homeTeam.conference === awayTeam.conference && homeTeam.division !== awayTeam.division) {
        const key = [homeTeam.id, awayTeam.id].sort().join('-')
        confMatchups.set(key, (confMatchups.get(key) ?? 0) + 1)
      }
    }
    for (const count of confMatchups.values()) {
      expect(count).toBeGreaterThanOrEqual(2)
    }
  })

  it('each team plays >=2x inter-conference opponents', () => {
    const interMatchups = new Map<string, number>()
    for (const game of games) {
      const homeTeam = TEAMS.find((t) => t.id === game.homeTeamId)
      const awayTeam = TEAMS.find((t) => t.id === game.awayTeamId)
      if (homeTeam && awayTeam && homeTeam.conference !== awayTeam.conference) {
        const key = [homeTeam.id, awayTeam.id].sort().join('-')
        interMatchups.set(key, (interMatchups.get(key) ?? 0) + 1)
      }
    }
    for (const count of interMatchups.values()) {
      expect(count).toBeGreaterThanOrEqual(2)
    }
  })

  it('all games have correct metadata', () => {
    for (const game of games) {
      expect(game.season).toBe('2025-26')
      expect(game.seasonYear).toBe(2025)
      expect(game.status).toBe('scheduled')
      expect(game.homeScore).toBeNull()
      expect(game.awayScore).toBeNull()
      expect(typeof game.isConference).toBe('boolean')
      expect(typeof game.isDivision).toBe('boolean')
    }
  })
})
