import { useState } from 'react'

interface TeamLogoProps {
  team: {
    externalId?: string
    name: string
    abbreviation: string
    colors?: { primary: string; secondary: string }
  }
  size?: number
  className?: string
}

export function TeamLogo({ team, size = 32, className = '' }: TeamLogoProps) {
  const [error, setError] = useState(false)

  if (error || !team.externalId) {
    return (
      <div
        className={`rounded-md grid place-items-center font-display shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: team.colors?.primary ?? '#1d428a',
          color: '#0b0d10',
          fontSize: size * 0.3,
        }}
      >
        {team.abbreviation}
      </div>
    )
  }

  return (
    <img
      src={`https://cdn.nba.com/logos/nba/${team.externalId}/global/L/logo.svg`}
      alt={team.name}
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      onError={() => setError(true)}
    />
  )
}
