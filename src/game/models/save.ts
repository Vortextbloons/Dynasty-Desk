export interface SaveMetadata {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  appVersion: string
  schemaVersion: number
  teamId: string
  teamName: string
  currentSeason: number
  currentDate: string
  leagueName: string
  snapshotId: string
}

export interface GameSettings {
  difficulty: 'rookie' | 'pro' | 'all_star' | 'superstar' | 'hall_of_fame'
  simSpeed: 'slow' | 'balanced' | 'fast'
  autoSave: boolean
  injuries: boolean
  fatigue: boolean
  salaryCap: boolean
  startSeason: string
  snapshotId: string
}

export interface RngState {
  seed: string
  position: number
}

export interface UserManagerState {
  managerName: string
  teamId: string
}

export interface GameSave {
  metadata: SaveMetadata
  league: import('./league').LeagueState
  user: UserManagerState
  settings: GameSettings
  rngState: RngState
}
