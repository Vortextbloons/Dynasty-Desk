import { useEffect, useRef, useState, useMemo } from 'react'
import { useGameStore } from '@/store/useGameStore'
import { useSnapshot, useStaticData } from '@/data/useStaticData'
import type { Player } from '@/game/models'
import type { StaticTeam } from '@/game/models'

export interface GlobalSearchResult {
  players: Player[]
  teams: StaticTeam[]
}

export function useGlobalSearch(query: string): GlobalSearchResult {
  const save = useGameStore((s) => s.save)
  const staticData = useStaticData()
  const defaultSeasonId =
    staticData.status === 'ready' ? staticData.manifest.defaultSnapshotId : null
  const { snapshot } = useSnapshot(
    staticData.status === 'ready' ? staticData.loader : null,
    defaultSeasonId,
  )

  const [debouncedQuery, setDebouncedQuery] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query)
    }, 200)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  return useMemo(() => {
    if (!debouncedQuery) return { players: [], teams: [] }
    const q = debouncedQuery.toLowerCase()

    let allPlayers: Player[]
    let allTeams: StaticTeam[]

    if (save) {
      allPlayers = Object.values(save.league.players)
      allTeams = Object.values(save.league.teams) as unknown as StaticTeam[]
    } else if (snapshot) {
      allPlayers = snapshot.players as unknown as Player[]
      allTeams = snapshot.teams
    } else {
      return { players: [], teams: [] }
    }

    const players = allPlayers
      .filter((p) => {
        const name = `${p.firstName} ${p.lastName}`.toLowerCase()
        return name.includes(q)
      })
      .slice(0, 5)

    const teams = allTeams
      .filter((t) => {
        const name = `${t.abbreviation} ${t.city} ${t.name}`.toLowerCase()
        return name.includes(q)
      })
      .slice(0, 3)

    return { players, teams }
  }, [debouncedQuery, save, snapshot])
}
