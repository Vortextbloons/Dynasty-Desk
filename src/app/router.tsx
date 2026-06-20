import { Routes, Route, Navigate } from 'react-router-dom'
import { HomePage } from '@/pages/HomePage'
import { NewLeaguePage } from '@/pages/NewLeaguePage'
import { LoadGamePage } from '@/pages/LoadGamePage'
import { DashboardPage } from '@/pages/DashboardPage'
import { RosterPage } from '@/pages/RosterPage'
import { LineupPage } from '@/pages/LineupPage'
import { SchedulePage } from '@/pages/SchedulePage'
import { BoxScorePage } from '@/pages/BoxScorePage'
import { StandingsPage } from '@/pages/StandingsPage'
import { TradeCenterPage } from '@/pages/TradeCenterPage'
import { FreeAgencyPage } from '@/pages/FreeAgencyPage'
import { DraftPage } from '@/pages/DraftPage'
import { ContractsPage } from '@/pages/ContractsPage'
import { LeagueNewsPage } from '@/pages/LeagueNewsPage'
import { AwardsPage } from '@/pages/AwardsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { PlayerPage } from '@/pages/PlayerPage'
import { PlayerComparePage } from '@/pages/PlayerComparePage'
import { AllTimeLeadersPage } from '@/pages/AllTimeLeadersPage'
import { OffseasonPage } from '@/pages/OffseasonPage'
import { ScoutingPage } from '@/pages/ScoutingPage'
import { PlayoffsPage } from '@/pages/PlayoffsPage'
import { TrainingPage } from '@/pages/TrainingPage'
import { TeamStrategyPage } from '@/pages/TeamStrategyPage'
import { AppShell } from '@/components/layout/AppShell'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/new-league" element={<NewLeaguePage />} />
      <Route path="/load-game" element={<LoadGamePage />} />

      <Route
        path="/dashboard"
        element={
          <AppShell>
            <DashboardPage />
          </AppShell>
        }
      />
      <Route
        path="/roster"
        element={
          <AppShell>
            <RosterPage />
          </AppShell>
        }
      />
      <Route
        path="/lineup"
        element={
          <AppShell>
            <LineupPage />
          </AppShell>
        }
      />
      <Route
        path="/training"
        element={
          <AppShell>
            <TrainingPage />
          </AppShell>
        }
      />
      <Route
        path="/strategy"
        element={
          <AppShell>
            <TeamStrategyPage />
          </AppShell>
        }
      />
      <Route
        path="/schedule"
        element={
          <AppShell>
            <SchedulePage />
          </AppShell>
        }
      />
      <Route
        path="/game/:id"
        element={
          <AppShell>
            <BoxScorePage />
          </AppShell>
        }
      />
      <Route
        path="/standings"
        element={
          <AppShell>
            <StandingsPage />
          </AppShell>
        }
      />
      <Route
        path="/trades"
        element={
          <AppShell>
            <TradeCenterPage />
          </AppShell>
        }
      />
      <Route
        path="/free-agency"
        element={
          <AppShell>
            <FreeAgencyPage />
          </AppShell>
        }
      />
      <Route
        path="/draft"
        element={
          <AppShell>
            <DraftPage />
          </AppShell>
        }
      />
      <Route
        path="/contracts"
        element={
          <AppShell>
            <ContractsPage />
          </AppShell>
        }
      />
      <Route
        path="/news"
        element={
          <AppShell>
            <LeagueNewsPage />
          </AppShell>
        }
      />
      <Route
        path="/awards"
        element={
          <AppShell>
            <AwardsPage />
          </AppShell>
        }
      />
      <Route
        path="/settings"
        element={
          <AppShell>
            <SettingsPage />
          </AppShell>
        }
      />
      <Route
        path="/player/compare"
        element={
          <AppShell>
            <PlayerComparePage />
          </AppShell>
        }
      />
      <Route
        path="/player/:id"
        element={
          <AppShell>
            <PlayerPage />
          </AppShell>
        }
      />
      <Route
        path="/all-time"
        element={
          <AppShell>
            <AllTimeLeadersPage />
          </AppShell>
        }
      />
      <Route
        path="/offseason"
        element={
          <AppShell>
            <OffseasonPage />
          </AppShell>
        }
      />
      <Route
        path="/scouting"
        element={
          <AppShell>
            <ScoutingPage />
          </AppShell>
        }
      />
      <Route
        path="/playoffs"
        element={
          <AppShell>
            <PlayoffsPage />
          </AppShell>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
