import type { ScheduledGame } from '@/game/models/game'
import { addDays } from '@/lib/utils'
import type { Team } from '@/game/models/team'

export interface StubScheduleOptions {
  startDate: string
  userTeamId: string
  teams: Team[]
  count?: number
}

export function generateStubSchedule(options: StubScheduleOptions): ScheduledGame[] {
  const count = options.count ?? 3
  const opponents = options.teams.filter((t) => t.id !== options.userTeamId)
  if (opponents.length === 0) return []

  const games: ScheduledGame[] = []
  for (let i = 0; i < count; i++) {
    const opponentIndex = Math.floor(i / 2) % opponents.length
    const opp = opponents[opponentIndex]!
    const date = addDays(options.startDate, i)
    const isHome = i % 2 === 0
    games.push({
      id: `stub-${options.userTeamId}-${i + 1}-${date}`,
      season: '',
      date,
      homeTeamId: isHome ? options.userTeamId : opp.id,
      awayTeamId: isHome ? opp.id : options.userTeamId,
      status: 'scheduled',
      homeScore: null,
      awayScore: null,
      boxScoreId: null,
      boxScore: null,
      isConference: false,
      isDivision: false,
      seasonYear: 0,
      isUserTeamGame: true,
    })
  }
  return games
}
