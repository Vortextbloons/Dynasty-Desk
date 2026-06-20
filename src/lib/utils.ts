import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min
  if (value > max) return max
  return value
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function daysBetween(fromDate: string, toDate: string): number {
  if (toDate <= fromDate) return 0
  const from = new Date(fromDate + 'T00:00:00Z')
  const to = new Date(toDate + 'T00:00:00Z')
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}
