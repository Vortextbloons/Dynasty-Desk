import type { PlayerGameStats } from '@/game/models'
import type { Player } from '@/game/models'
import type { StaticTeam } from '@/game/models'
import { Card, CardContent } from '@/components/ui/card'
import { PlayerHeadshot } from '@/components/player/PlayerHeadshot'

type TeamColors = Pick<StaticTeam, 'colors'>

interface Props {
  label: string
  players: PlayerGameStats[]
  playerLookup: Map<string, Pick<Player, 'id' | 'firstName' | 'lastName' | 'position' | 'teamId'>>
  stat: (p: PlayerGameStats) => number
  teamLookup: Map<string, { abbreviation: string; name: string; colors: TeamColors['colors'] }>
}

export function TopPerformersCards({ label, players, playerLookup, stat, teamLookup }: Props) {
  const top = [...players]
    .filter((p) => stat(p) > 0)
    .sort((a, b) => stat(b) - stat(a))
    .slice(0, 3)

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
          Top — {label}
        </div>
        {top.length === 0 ? (
          <div className="text-sm text-[var(--color-muted-foreground)]">No data.</div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {top.map((p) => {
              const meta = playerLookup.get(p.playerId)
              const team = meta?.teamId ? teamLookup.get(meta.teamId) : undefined
              return (
                <div
                  key={p.playerId}
                  className="flex items-center gap-3 rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] p-2"
                >
                  {meta && (
                    <PlayerHeadshot
                      player={{
                        id: meta.id,
                        firstName: meta.firstName,
                        lastName: meta.lastName,
                        position: meta.position,
                        age: 0,
                        secondaryPositions: [],
                        heightInches: 0,
                        weightLbs: 0,
                        teamId: meta.teamId,
                        ratings: {
                          insideScoring: 0,
                          closeShot: 0,
                          midrange: 0,
                          threePoint: 0,
                          freeThrow: 0,
                          ballHandling: 0,
                          passing: 0,
                          offensiveIq: 0,
                          offensiveRebound: 0,
                          defensiveRebound: 0,
                          perimeterDefense: 0,
                          interiorDefense: 0,
                          steal: 0,
                          block: 0,
                          defensiveIq: 0,
                          speed: 0,
                          strength: 0,
                          vertical: 0,
                          stamina: 0,
                          durability: 0,
                          clutch: 0,
                          consistency: 0,
                          potential: 0,
                          overall: 0,
                        },
                        tendencies: {
                          usageRate: 0,
                          passRate: 0,
                          shotRate: 0,
                          driveRate: 0,
                          postUpRate: 0,
                          rimFrequency: 0,
                          shortMidFrequency: 0,
                          longMidFrequency: 0,
                          cornerThreeFrequency: 0,
                          aboveBreakThreeFrequency: 0,
                          threePointRate: 0,
                          freeThrowRate: 0,
                          turnoverRate: 0,
                          isolationRate: 0,
                          pickAndRollBallHandlerRate: 0,
                          pickAndRollRollManRate: 0,
                          spotUpRate: 0,
                          transitionRate: 0,
                          cutRate: 0,
                          foulRate: 0,
                          stealAttemptRate: 0,
                          blockAttemptRate: 0,
                          crashOffensiveGlassRate: 0,
                        },
                        traits: {
                          workEthic: 0,
                          loyalty: 0,
                          ego: 0,
                          greed: 0,
                          leadership: 0,
                          coachability: 0,
                          injuryRisk: 0,
                          shotCreation: 0,
                          defensiveVersatility: 0,
                        },
                        contract: {
                          salaryByYear: [],
                          yearsRemaining: 0,
                          option: 'none',
                          optionYear: null,
                          noTradeClause: false,
                          signingBonusByYear: [],
                          likelyBonusesByYear: [],
                          unlikelyBonusesByYear: [],
                          guaranteed: false,
                          guaranteedByYear: [],
                          tradeKickers: [],
                          poisonPill: false,
                          birdRights: false,
                          earlyBird: false,
                          baseYearCompensation: false,
                          deferredMoney: [],
                        },
                        morale: {
                          level: 0,
                          happiness: 0,
                          roleSatisfaction: 0,
                          teamSatisfaction: 0,
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
                          recentForm: 0,
                          ageAtPeak: 0,
                          progressionCurve: 'normal',
                          ratingsDelta: {},
                          breakoutChance: 0,
                          bustRisk: 0,
                        },
                        seasonStats: {
                          season: '',
                          teamId: null,
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
                        historicalSeasons: [],
                      }}
                      team={team ?? undefined}
                      size={36}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {meta ? `${meta.firstName.charAt(0)}. ${meta.lastName}` : p.playerId}
                    </div>
                    <div className="text-[10px] text-[var(--color-muted-foreground)]">
                      {team?.abbreviation ?? ''}
                    </div>
                  </div>
                  <div className="font-display text-lg">{stat(p)}</div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
