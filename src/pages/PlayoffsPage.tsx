import { useMemo, useState } from 'react'
import { useGameStore } from '@/store/useGameStore'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BracketTree } from '@/components/playoffs/BracketTree'
import { PlayoffListMobile } from '@/components/playoffs/PlayoffListMobile'
import { PlayInSection } from '@/components/playoffs/PlayInSection'
import { FinalsCard } from '@/components/playoffs/FinalsCard'
import { ChampionCard } from '@/components/playoffs/ChampionCard'
import { cn } from '@/lib/utils'
import { Trophy, Play, Square, FastForward } from 'lucide-react'

type Tab = 'East' | 'West' | 'Finals'

export function PlayoffsPage() {
  const save = useGameStore((s) => s.save)
  const generatePlayoffBracket = useGameStore((s) => s.generatePlayoffBracket)
  const simNextPlayoffGame = useGameStore((s) => s.simNextPlayoffGame)
  const simPlayoffSeries = useGameStore((s) => s.simPlayoffSeries)
  const simPlayoffsToCompletion = useGameStore((s) => s.simPlayoffsToCompletion)
  const transitionToOffseason = useGameStore((s) => s.transitionToOffseason)
  const simRunning = useGameStore((s) => s.simRunning)
  const simProgress = useGameStore((s) => s.simProgress)
  const cancelSimulation = useGameStore((s) => s.cancelSimulation)
  const [activeTab, setActiveTab] = useState<Tab>('East')

  const bracket = save?.league.playoffBracket
  const teams = save?.league.teams ?? {}

  const canGenerate = useMemo(() => {
    if (!save) return false
    const phase = save.league.phase
    return (
      (phase === 'regular_season' || phase === 'play_in' || phase === 'playoffs') &&
      !save.league.playoffBracket
    )
  }, [save])

  const allSeries = useMemo(() => {
    if (!bracket) return []
    return [...bracket.east, ...bracket.west]
  }, [bracket])

  const eastSeries = useMemo(
    () => allSeries.filter((s) => s.conference === 'East'),
    [allSeries],
  )
  const westSeries = useMemo(
    () => allSeries.filter((s) => s.conference === 'West'),
    [allSeries],
  )

  const handleSimSeries = async (seriesId: string) => {
    await simPlayoffSeries(seriesId)
  }

  const handleSimNext = async () => {
    await simNextPlayoffGame()
  }

  const handleSimAll = async () => {
    await simPlayoffsToCompletion()
  }

  const handleTransition = () => {
    transitionToOffseason()
  }

  if (!save) {
    return (
      <div className="text-center py-12 text-[var(--color-muted-foreground)]">
        No active save. Load or create a league first.
      </div>
    )
  }

  if (!bracket && !canGenerate) {
    return (
      <div>
        <PageHeader
          eyebrow="Playoffs"
          title="Playoffs"
          description="Complete the regular season to generate the playoff bracket."
        />
        <Card>
          <CardContent className="p-8 text-center">
            <Trophy className="size-12 mx-auto mb-4 text-[var(--color-muted-foreground)]" />
            <p className="text-[var(--color-muted-foreground)]">
              {save.league.phase === 'regular_season'
                ? 'Sim through the regular season to reach the playoffs.'
                : `Current phase: ${save.league.phase.replace('_', ' ')}`}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Playoffs"
        title={`${save.league.rules.seasonLabel} NBA Playoffs`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canGenerate && (
              <Button onClick={generatePlayoffBracket} size="sm">
                Generate Bracket
              </Button>
            )}
            {bracket && bracket.status !== 'complete' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSimNext}
                  disabled={simRunning}
                >
                  <Play className="size-3.5 mr-1" />
                  Sim Game
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSimAll}
                  disabled={simRunning}
                >
                  <FastForward className="size-3.5 mr-1" />
                  Sim Bracket
                </Button>
                {simRunning && (
                  <Button variant="destructive" size="sm" onClick={cancelSimulation}>
                    <Square className="size-3.5 mr-1" />
                    Cancel
                  </Button>
                )}
              </>
            )}
            {bracket?.status === 'complete' && (
              <Button onClick={handleTransition} size="sm">
                Begin Offseason
              </Button>
            )}
          </div>
        }
      />

      {simRunning && simProgress && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-[var(--color-muted-foreground)]">
              {simProgress.currentMatchup || 'Simulating...'}
            </span>
            <span className="font-medium">{simProgress.percentage}%</span>
          </div>
          <div className="w-full bg-[var(--color-surface-2)] rounded-full h-2">
            <div
              className="bg-[var(--color-primary)] h-2 rounded-full transition-all duration-300"
              style={{ width: `${simProgress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {bracket?.status === 'complete' && bracket.championTeamId && (
        <div className="mb-6">
          <ChampionCard
            bracket={bracket}
            championTeam={teams[bracket.championTeamId]}
            runnerUpTeam={
              bracket.runnerUpTeamId ? teams[bracket.runnerUpTeamId] : undefined
            }
            finalsMvp={
              bracket.finalsMvpPlayerId
                ? save.league.players[bracket.finalsMvpPlayerId]
                : undefined
            }
          />
        </div>
      )}

      {bracket?.playIn && bracket.status === 'play_in' && (
        <div className="mb-6">
          <PlayInSection playIn={bracket.playIn} teams={teams} />
        </div>
      )}

      {bracket && (bracket.status === 'bracket' || bracket.status === 'finals' || bracket.status === 'complete') && (
        <>
          <div className="flex gap-1 mb-4 border-b border-[var(--color-line-soft)]">
            {(['East', 'West', 'Finals'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors relative',
                  activeTab === tab
                    ? 'text-[var(--color-foreground)]'
                    : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
                )}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary)]" />
                )}
              </button>
            ))}
          </div>

          <div className="hidden md:block">
            {activeTab === 'East' && (
              <BracketTree
                series={eastSeries}
                teams={teams}
                onSimSeries={handleSimSeries}
              />
            )}
            {activeTab === 'West' && (
              <BracketTree
                series={westSeries}
                teams={teams}
                onSimSeries={handleSimSeries}
              />
            )}
            {activeTab === 'Finals' && bracket.finals && (
              <FinalsCard
                finals={bracket.finals}
                higherTeam={teams[bracket.finals.higherSeedTeamId]}
                lowerTeam={teams[bracket.finals.lowerSeedTeamId]}
                onSimSeries={() => handleSimSeries(bracket.finals!.id)}
              />
            )}
          </div>

          <div className="md:hidden">
            {activeTab === 'East' && (
              <PlayoffListMobile
                series={eastSeries}
                teams={teams}
                onSimSeries={handleSimSeries}
              />
            )}
            {activeTab === 'West' && (
              <PlayoffListMobile
                series={westSeries}
                teams={teams}
                onSimSeries={handleSimSeries}
              />
            )}
            {activeTab === 'Finals' && bracket.finals && (
              <FinalsCard
                finals={bracket.finals}
                higherTeam={teams[bracket.finals.higherSeedTeamId]}
                lowerTeam={teams[bracket.finals.lowerSeedTeamId]}
                onSimSeries={() => handleSimSeries(bracket.finals!.id)}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}
