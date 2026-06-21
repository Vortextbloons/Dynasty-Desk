import type { LeaguePhase } from '@/game/models/league'
import type { FreeAgentOffer } from '@/game/models/freeAgent'

const PHASE_LABELS: Record<LeaguePhase, string> = {
  preseason: 'Preseason',
  regular_season: 'Regular Season',
  play_in: 'Play-In',
  playoffs: 'Playoffs',
  offseason: 'Offseason',
  draft: 'Draft',
  free_agency: 'Free Agency',
}

const OFFER_STATUS_LABELS: Record<FreeAgentOffer['status'], string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  matched: 'Matched',
  expired: 'Expired',
  withdrawn: 'Withdrawn',
}

export function formatGameDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatGameDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function formatPhaseLabel(phase: LeaguePhase | string): string {
  if (phase in PHASE_LABELS) {
    return PHASE_LABELS[phase as LeaguePhase]
  }
  return phase.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function formatOfferStatus(status: FreeAgentOffer['status']): string {
  return OFFER_STATUS_LABELS[status]
}

export function formatNewsType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function fmtMoney(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`
  return `${sign}$${abs}`
}

export function formatWinPct(winPct: number): string {
  return `${(winPct * 100).toFixed(1)}%`
}
