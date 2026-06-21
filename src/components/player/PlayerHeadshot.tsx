import { useState } from 'react'
import type { Player } from '@/game/models'
import type { StaticTeam } from '@/game/models'

type TeamColorSource = Pick<StaticTeam, 'colors'>
export type PlayerHeadshotSource = Pick<Player, 'firstName' | 'lastName' | 'externalId'>

export function PlayerHeadshot({
  player,
  team,
  size = 40,
}: {
  player: PlayerHeadshotSource
  team?: TeamColorSource | null
  size?: number
}) {
  const [imgError, setImgError] = useState(false)

  const externalId = player.externalId
  const cdnUrl = externalId
    ? `https://cdn.nba.com/headshots/nba/latest/1040x760/${externalId}.png`
    : undefined
  const localUrl = externalId
    ? `${import.meta.env.BASE_URL}data/nba/headshots/${externalId}.png`
    : undefined

  if (cdnUrl && !imgError) {
    return (
      <img
        src={cdnUrl}
        alt={`${player.firstName} ${player.lastName}`}
        className="rounded-md object-cover"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    )
  }

  if (localUrl && !imgError) {
    return (
      <img
        src={localUrl}
        alt={`${player.firstName} ${player.lastName}`}
        className="rounded-md object-cover"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    )
  }

  const initials = `${player.firstName.charAt(0)}${player.lastName.charAt(0)}`
  const bgColor = team?.colors?.primary ?? '#1d428a'

  return (
    <div
      className="rounded-md grid place-items-center font-display text-[10px] shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        color: '#0b0d10',
      }}
    >
      {initials}
    </div>
  )
}
