export interface PlayerStreaks {
  consecutiveMakes: number
  consecutiveMisses: number
}

export interface TeamStreaks {
  consecutiveMakes: number
  consecutiveMisses: number
}

export function createPlayerStreaks(): PlayerStreaks {
  return { consecutiveMakes: 0, consecutiveMisses: 0 }
}

export function createTeamStreaks(): TeamStreaks {
  return { consecutiveMakes: 0, consecutiveMisses: 0 }
}

export function updatePlayerStreaks(
  streaks: PlayerStreaks,
  made: boolean,
): void {
  if (made) {
    streaks.consecutiveMakes++
    streaks.consecutiveMisses = 0
  } else {
    streaks.consecutiveMisses++
    streaks.consecutiveMakes = 0
  }
}

export function updateTeamStreaks(
  streaks: TeamStreaks,
  made: boolean,
): void {
  if (made) {
    streaks.consecutiveMakes++
    streaks.consecutiveMisses = 0
  } else {
    streaks.consecutiveMisses++
    streaks.consecutiveMakes = 0
  }
}

export function resetStreaksOnSub(streaks: PlayerStreaks): void {
  streaks.consecutiveMakes = Math.max(0, streaks.consecutiveMakes - 1)
  streaks.consecutiveMisses = Math.max(0, streaks.consecutiveMisses - 1)
}

export function hotHandModifier(streaks: PlayerStreaks): number {
  if (streaks.consecutiveMakes >= 3) {
    return Math.min(0.02 * (streaks.consecutiveMakes - 2), 0.10)
  }
  if (streaks.consecutiveMisses >= 3) {
    return -Math.min(0.01 * (streaks.consecutiveMisses - 2), 0.05)
  }
  return 0
}

export function teamStreakModifier(streaks: TeamStreaks): number {
  if (streaks.consecutiveMakes >= 5) {
    return 0.01
  }
  if (streaks.consecutiveMisses >= 5) {
    return -0.01
  }
  return 0
}

export function streakUsageModifier(streaks: PlayerStreaks): number {
  if (streaks.consecutiveMakes >= 3) return 1.1
  if (streaks.consecutiveMisses >= 3) return 0.9
  return 1.0
}
