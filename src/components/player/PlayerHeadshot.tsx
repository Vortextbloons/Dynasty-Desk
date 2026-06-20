import { useState } from 'react'
import type { Player } from '@/game/models'
import type { StaticTeam } from '@/game/models'

type TeamColorSource = Pick<StaticTeam, 'colors'>

export function PlayerHeadshot({
  player,
  team,
  size = 40,
}: {
  player: Player
  team?: TeamColorSource | null
  size?: number
}) {
  const [imgError, setImgError] = useState(false)

  const externalId = (player as unknown as { externalId?: string }).externalId
  const headshotUrl = externalId
    ? `/data/nba/headshots/${externalId}.jpg`
    : undefined

  if (headshotUrl && !imgError) {
    return (
      <img
        src={headshotUrl}
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
