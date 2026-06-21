import type { GameSave } from '@/game/models'

export type ValidationResult =
  | { ok: true; save: GameSave }
  | { ok: false; reason: string }

const SUPPORTED_SCHEMA_VERSIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export function validateSave(input: unknown): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { ok: false, reason: 'Save file is not a valid JSON object.' }
  }

  const obj = input as Record<string, unknown>

  if (!obj.metadata || typeof obj.metadata !== 'object') {
    return { ok: false, reason: 'Missing or invalid metadata.' }
  }
  if (!obj.league || typeof obj.league !== 'object') {
    return { ok: false, reason: 'Missing or invalid league state.' }
  }
  if (!obj.settings || typeof obj.settings !== 'object') {
    return { ok: false, reason: 'Missing or invalid settings.' }
  }
  if (!obj.rngState || typeof obj.rngState !== 'object') {
    return { ok: false, reason: 'Missing or invalid RNG state.' }
  }

  const meta = obj.metadata as Record<string, unknown>
  if (typeof meta.id !== 'string' || !meta.id) {
    return { ok: false, reason: 'Save metadata missing valid id.' }
  }
  if (typeof meta.name !== 'string') {
    return { ok: false, reason: 'Save metadata missing name.' }
  }
  if (typeof meta.teamId !== 'string') {
    return { ok: false, reason: 'Save metadata missing teamId.' }
  }
  if (typeof meta.appVersion !== 'string') {
    return { ok: false, reason: 'Missing or invalid app version.' }
  }
  if (typeof meta.schemaVersion !== 'number') {
    return { ok: false, reason: 'Missing or invalid schema version.' }
  }

  if (!SUPPORTED_SCHEMA_VERSIONS.includes(meta.schemaVersion)) {
    return {
      ok: false,
      reason: `Unsupported save version: ${meta.schemaVersion}. This version of Dynasty Desk supports schema versions ${SUPPORTED_SCHEMA_VERSIONS.join(', ')}.`,
    }
  }

  const league = obj.league as Record<string, unknown>
  if (typeof league.id !== 'string') {
    return { ok: false, reason: 'League missing id.' }
  }
  if (typeof league.currentDate !== 'string') {
    return { ok: false, reason: 'League missing currentDate.' }
  }
  if (typeof league.userTeamId !== 'string') {
    return { ok: false, reason: 'League missing userTeamId.' }
  }

  if (!league.teams || typeof league.teams !== 'object') {
    return { ok: false, reason: 'League missing teams.' }
  }
  if (!league.players || typeof league.players !== 'object') {
    return { ok: false, reason: 'League missing players.' }
  }

  const teams = league.teams as Record<string, unknown>
  const players = league.players as Record<string, unknown>
  const teamIds = new Set(Object.keys(teams))

  if (teamIds.size === 0) {
    return { ok: false, reason: 'League has no teams.' }
  }

  if (!teamIds.has(league.userTeamId)) {
    return {
      ok: false,
      reason: `userTeamId "${league.userTeamId}" does not match any team.`,
    }
  }

  for (const [teamId, teamRaw] of Object.entries(teams)) {
    if (!teamRaw || typeof teamRaw !== 'object') {
      return { ok: false, reason: `Team "${teamId}" is invalid.` }
    }
    const team = teamRaw as Record<string, unknown>
    if (!Array.isArray(team.roster)) {
      return { ok: false, reason: `Team "${teamId}" missing roster array.` }
    }
    if (team.frozenPicks !== undefined && !Array.isArray(team.frozenPicks)) {
      return { ok: false, reason: `Team "${teamId}" has invalid frozenPicks array.` }
    }
    if (team.tradeExceptions !== undefined && !Array.isArray(team.tradeExceptions)) {
      return { ok: false, reason: `Team "${teamId}" has invalid tradeExceptions array.` }
    }
  }

  if (league.draftPicks !== undefined && !Array.isArray(league.draftPicks)) {
    return { ok: false, reason: 'League draftPicks must be an array.' }
  }
  if (Array.isArray(league.draftPicks)) {
    for (const pickRaw of league.draftPicks) {
      if (!pickRaw || typeof pickRaw !== 'object') continue
      const pick = pickRaw as Record<string, unknown>
      if (typeof pick.id !== 'string' || typeof pick.currentTeamId !== 'string') continue
      if (!teamIds.has(pick.currentTeamId)) {
        return {
          ok: false,
          reason: `Pick ${pick.id} is owned by unknown team ${pick.currentTeamId}.`,
        }
      }
    }
  }
  if (league.activeProposals !== undefined && !Array.isArray(league.activeProposals)) {
    return { ok: false, reason: 'League activeProposals must be an array.' }
  }

  for (const [playerId, playerRaw] of Object.entries(players)) {
    if (!playerRaw || typeof playerRaw !== 'object') {
      return { ok: false, reason: `Player "${playerId}" is invalid.` }
    }
    const player = playerRaw as Record<string, unknown>
    if (player.teamId !== null && typeof player.teamId !== 'string') {
      return {
        ok: false,
        reason: `Player "${playerId}" has invalid teamId.`,
      }
    }
    if (
      typeof player.teamId === 'string' &&
      !teamIds.has(player.teamId)
    ) {
      return {
        ok: false,
        reason: `Player "${playerId}" references non-existent team "${player.teamId}".`,
      }
    }
  }

  if (typeof league.news !== 'undefined' && !Array.isArray(league.news)) {
    return { ok: false, reason: 'League news must be an array.' }
  }

  if (league.rivalries !== undefined && typeof league.rivalries !== 'object') {
    return { ok: false, reason: 'League rivalries must be an object.' }
  }
  if (league.records !== undefined && !Array.isArray(league.records)) {
    return { ok: false, reason: 'League records must be an array.' }
  }
  if (league.hallOfFame !== undefined && !Array.isArray(league.hallOfFame)) {
    return { ok: false, reason: 'League hallOfFame must be an array.' }
  }

  if (!obj.user || typeof obj.user !== 'object') {
    return { ok: false, reason: 'Missing or invalid user state.' }
  }
  const user = obj.user as Record<string, unknown>
  if (typeof user.managerName !== 'string') {
    return { ok: false, reason: 'User missing managerName.' }
  }
  if (typeof user.teamId !== 'string') {
    return { ok: false, reason: 'User missing teamId.' }
  }

  if (user.teamId !== meta.teamId) {
    return {
      ok: false,
      reason: `User teamId "${user.teamId}" does not match metadata teamId "${meta.teamId}".`,
    }
  }
  if (user.teamId !== league.userTeamId) {
    return {
      ok: false,
      reason: `User teamId "${user.teamId}" does not match league userTeamId "${league.userTeamId}".`,
    }
  }

  return { ok: true, save: input as GameSave }
}
