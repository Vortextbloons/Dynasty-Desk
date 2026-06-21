import { describe, it, expect } from 'vitest'
import {
  createRecordBrokenEvent,
  createCoachPressureEvent,
  createRosterChangeEvent,
} from '@/game/league/newsEngine'

describe('createRecordBrokenEvent', () => {
  it('creates a record_broken news event', () => {
    const event = createRecordBrokenEvent(
      { category: 'single_game_points', value: 81 },
      'player-1',
      '2025-10-21',
    )
    expect(event.type).toBe('record_broken')
    expect(event.headline).toContain('81')
    expect(event.playerIds).toContain('player-1')
    expect(event.importance).toBe('high')
  })

  it('converts underscores to spaces in category label', () => {
    const event = createRecordBrokenEvent(
      { category: 'season_rebounds', value: 1500 },
      'player-2',
      '2025-10-21',
    )
    expect(event.headline).toContain('season rebounds')
    expect(event.body).toContain('season rebounds')
  })
})

describe('createCoachPressureEvent', () => {
  it('creates a high pressure event with hot headline', () => {
    const event = createCoachPressureEvent('team-1', 'Lakers', 'high', '2025-10-21')
    expect(event.type).toBe('coach_pressure')
    expect(event.teamIds).toContain('team-1')
    expect(event.headline).toContain('hot')
    expect(event.importance).toBe('high')
  })

  it('creates a medium pressure event with warm headline', () => {
    const event = createCoachPressureEvent('team-1', 'Lakers', 'medium', '2025-10-21')
    expect(event.headline).toContain('warm')
    expect(event.importance).toBe('medium')
  })
})

describe('createRosterChangeEvent', () => {
  it('creates a roster_change news event with from and to', () => {
    const event = createRosterChangeEvent(
      'player-1',
      'LeBron James',
      'Lakers',
      'Celtics',
      'was traded',
      '2025-10-21',
    )
    expect(event.type).toBe('roster_change')
    expect(event.playerIds).toContain('player-1')
    expect(event.headline).toContain('traded')
    expect(event.headline).toContain('from Lakers')
    expect(event.headline).toContain('to Celtics')
  })

  it('handles null from team', () => {
    const event = createRosterChangeEvent(
      'player-2',
      'Jayson Tatum',
      null,
      'Nets',
      'was signed',
      '2025-10-21',
    )
    expect(event.headline).not.toContain('from')
    expect(event.headline).toContain('to Nets')
  })

  it('handles null to team', () => {
    const event = createRosterChangeEvent(
      'player-3',
      'Kevin Durant',
      'Suns',
      null,
      'was waived',
      '2025-10-21',
    )
    expect(event.headline).toContain('from Suns')
    expect(event.headline).not.toContain('to')
  })
})
