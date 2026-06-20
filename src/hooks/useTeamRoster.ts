import { useMemo } from 'react'
import { useGameStore } from '@/store/useGameStore'
import { useSnapshot, useStaticData } from '@/data/useStaticData'
import { hydrateStaticPlayer } from '@/game/core/hydrateStaticPlayer'
import type { Player } from '@/game/models'
import type { Position } from '@/game/models/position'

export interface RosterFilter {
  search?: string
  positions?: Position[]
  ageRange?: [number, number]
  status?: string[]
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  teamId?: string
}

export function useTeamRoster(filter: RosterFilter = {}): Player[] {
  const save = useGameStore((s) => s.save)
  const staticData = useStaticData()
  const defaultSeasonId =
    staticData.status === 'ready' ? staticData.manifest.defaultSnapshotId : null
  const { snapshot } = useSnapshot(
    staticData.status === 'ready' ? staticData.loader : null,
    defaultSeasonId,
  )

  const {
    search = '',
    positions = [],
    ageRange,
    status = [],
    sortKey = 'overall',
    sortDir = 'desc',
    teamId,
  } = filter

  return useMemo(() => {
    let players: Player[] = []

    if (save) {
      const targetTeamId = teamId ?? save.league.userTeamId
      const rosterIds = new Set(save.league.teams[targetTeamId]?.roster ?? [])
      players = Object.values(save.league.players).filter((p) =>
        rosterIds.has(p.id),
      )
    } else if (snapshot) {
      const targetTeamId = teamId
      const filtered = targetTeamId
        ? snapshot.players.filter((p) => p.teamId === targetTeamId)
        : snapshot.players
      players = filtered.map((sp) =>
        hydrateStaticPlayer(sp, snapshot.seasonLabel, snapshot.seasonStats),
      )
    }

    const filtered = players.filter((p) => {
      if (positions.length > 0 && !positions.includes(p.position)) return false
      if (ageRange) {
        if (p.age < ageRange[0] || p.age > ageRange[1]) return false
      }
      if (status.length > 0) {
        const matchesStatus = status.some((s) => {
          if (s === 'healthy') return p.health.status === 'healthy'
          if (s === 'injured') return p.health.status !== 'healthy'
          if (s === 'ntc') return p.contract.noTradeClause
          if (s === 'opt-out') return p.contract.option === 'player'
          return false
        })
        if (!matchesStatus) return false
      }
      if (search) {
        const q = search.toLowerCase()
        const name = `${p.firstName} ${p.lastName}`.toLowerCase()
        if (!name.includes(q)) return false
      }
      return true
    })

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'name':
          cmp = `${a.lastName}${a.firstName}`.localeCompare(
            `${b.lastName}${b.firstName}`,
          )
          break
        case 'position':
          cmp = a.position.localeCompare(b.position)
          break
        case 'age':
          cmp = a.age - b.age
          break
        case 'overall':
          cmp = a.ratings.overall - b.ratings.overall
          break
        case 'threePoint':
          cmp = a.ratings.threePoint - b.ratings.threePoint
          break
        case 'defense':
          cmp =
            (a.ratings.perimeterDefense + a.ratings.interiorDefense + a.ratings.defensiveIq) / 3 -
            (b.ratings.perimeterDefense + b.ratings.interiorDefense + b.ratings.defensiveIq) / 3
          break
        case 'capHit':
          cmp =
            (a.contract.salaryByYear[0] ?? 0) - (b.contract.salaryByYear[0] ?? 0)
          break
        case 'yearsRemaining':
          cmp = a.contract.yearsRemaining - b.contract.yearsRemaining
          break
        case 'morale':
          cmp = a.morale.happiness - b.morale.happiness
          break
        case 'fatigue':
          cmp = a.fatigue - b.fatigue
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return sorted
  }, [save, snapshot, teamId, search, positions, ageRange, status, sortKey, sortDir])
}
