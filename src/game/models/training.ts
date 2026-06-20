export type TrainingFocus =
  | 'shooting'
  | 'defense'
  | 'playmaking'
  | 'strength'
  | 'conditioning'
  | 'balanced'
  | 'rehab'

export const TRAINING_FOCUS_LABELS: Readonly<Record<TrainingFocus, string>> = {
  shooting: 'Shooting',
  defense: 'Defense',
  playmaking: 'Playmaking',
  strength: 'Strength',
  conditioning: 'Conditioning',
  balanced: 'Balanced',
  rehab: 'Rehab',
}

export function parseTrainingFocus(value: unknown): TrainingFocus {
  const valid: TrainingFocus[] = [
    'shooting',
    'defense',
    'playmaking',
    'strength',
    'conditioning',
    'balanced',
    'rehab',
  ]
  if (typeof value === 'string' && valid.includes(value as TrainingFocus)) {
    return value as TrainingFocus
  }
  return 'balanced'
}
