import type { PlayerSeasonStats } from '@/game/models'
import { perGame } from '@/game/models/playerSeasonStats'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function sumSeasons(seasons: PlayerSeasonStats[]) {
  const totals = seasons.reduce(
    (acc, s) => {
      acc.gamesPlayed += s.gamesPlayed
      acc.minutes += s.minutes
      acc.points += s.points
      acc.rebounds += s.rebounds
      acc.assists += s.assists
      acc.steals += s.steals
      acc.blocks += s.blocks
      acc.fgm += s.fgm
      acc.fga += s.fga
      acc.tpm += s.tpm
      acc.tpa += s.tpa
      acc.ftm += s.ftm
      acc.fta += s.fta
      return acc
    },
    {
      gamesPlayed: 0,
      minutes: 0,
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
      fgm: 0,
      fga: 0,
      tpm: 0,
      tpa: 0,
      ftm: 0,
      fta: 0,
    },
  )

  const gp = Math.max(1, totals.gamesPlayed)
  const tsDenom = 2 * (totals.fga + 0.44 * totals.fta)
  const tsPct = tsDenom > 0 ? (totals.points / tsDenom) * 100 : 0

  return {
    gp: totals.gamesPlayed,
    ppg: totals.points / gp,
    rpg: totals.rebounds / gp,
    apg: totals.assists / gp,
    spg: totals.steals / gp,
    bpg: totals.blocks / gp,
    mpg: totals.minutes / gp,
    tsPct,
  }
}

function fmtStat(n: number, decimals = 1): string {
  return n.toFixed(decimals)
}

export function StatsTable({
  historicalSeasons,
}: {
  historicalSeasons: PlayerSeasonStats[]
}) {
  const career = sumSeasons(historicalSeasons)

  const sorted = [...historicalSeasons].sort((a, b) =>
    b.season.localeCompare(a.season),
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-sm">Career Averages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            {[
              { label: 'PPG', value: fmtStat(career.ppg) },
              { label: 'RPG', value: fmtStat(career.rpg) },
              { label: 'APG', value: fmtStat(career.apg) },
              { label: 'SPG', value: fmtStat(career.spg) },
              { label: 'BPG', value: fmtStat(career.bpg) },
              { label: 'MPG', value: fmtStat(career.mpg) },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-mono text-lg font-bold">{s.value}</div>
                <div className="text-xs text-[var(--color-muted-foreground)]">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-sm">Season-by-Season</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-line-soft)] text-left text-xs text-[var(--color-muted-foreground)]">
                  <th className="pb-2 pr-4 font-medium">Season</th>
                  <th className="pb-2 pr-4 text-right font-medium">GP</th>
                  <th className="pb-2 pr-4 text-right font-medium">MPG</th>
                  <th className="pb-2 pr-4 text-right font-medium">PPG</th>
                  <th className="pb-2 pr-4 text-right font-medium">RPG</th>
                  <th className="pb-2 pr-4 text-right font-medium">APG</th>
                  <th className="pb-2 pr-4 text-right font-medium">SPG</th>
                  <th className="pb-2 pr-4 text-right font-medium">BPG</th>
                  <th className="pb-2 text-right font-medium">TS%</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s) => {
                  const pg = perGame(s)
                  const tsDenom = 2 * (s.fga + 0.44 * s.fta)
                  const tsPct = tsDenom > 0 ? (s.points / tsDenom) * 100 : 0
                  return (
                    <tr
                      key={s.season}
                      className="border-b border-[var(--color-line-soft)] last:border-0"
                    >
                      <td className="py-2 pr-4 font-mono text-xs">{s.season}</td>
                      <td className="py-2 pr-4 text-right font-mono">{s.gamesPlayed}</td>
                      <td className="py-2 pr-4 text-right font-mono">{fmtStat(pg.mpg)}</td>
                      <td className="py-2 pr-4 text-right font-mono">{fmtStat(pg.ppg)}</td>
                      <td className="py-2 pr-4 text-right font-mono">{fmtStat(pg.rpg)}</td>
                      <td className="py-2 pr-4 text-right font-mono">{fmtStat(pg.apg)}</td>
                      <td className="py-2 pr-4 text-right font-mono">{fmtStat(pg.spg)}</td>
                      <td className="py-2 pr-4 text-right font-mono">{fmtStat(pg.bpg)}</td>
                      <td className="py-2 text-right font-mono">{fmtStat(tsPct)}%</td>
                    </tr>
                  )
                })}
                {sorted.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-8 text-center text-sm text-[var(--color-muted-foreground)]"
                    >
                      No season data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
