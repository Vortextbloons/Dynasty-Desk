import type { TeamStrategy } from '@/game/models/team'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { strategyPreviewLines } from '@/game/sim/strategyEngine'

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-[var(--color-muted-foreground)]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-2 py-1.5 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function StrategyEditor({
  strategy,
  onChange,
}: {
  strategy: TeamStrategy
  onChange: (strategy: TeamStrategy) => void
}) {
  const preview = strategyPreviewLines(strategy)

  const updateOffense = <K extends keyof TeamStrategy['offense']>(
    key: K,
    value: TeamStrategy['offense'][K],
  ) => {
    onChange({
      ...strategy,
      offense: { ...strategy.offense, [key]: value },
    })
  }

  const updateDefense = <K extends keyof TeamStrategy['defense']>(
    key: K,
    value: TeamStrategy['defense'][K],
  ) => {
    onChange({
      ...strategy,
      defense: { ...strategy.defense, [key]: value },
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">Offense</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Pace"
            value={strategy.offense.pace}
            options={[
              { value: 'slow', label: 'Slow' },
              { value: 'balanced', label: 'Balanced' },
              { value: 'fast', label: 'Fast' },
            ]}
            onChange={(v) => updateOffense('pace', v)}
          />
          <SelectField
            label="Shot profile"
            value={strategy.offense.shotProfile}
            options={[
              { value: 'paint', label: 'Paint' },
              { value: 'balanced', label: 'Balanced' },
              { value: 'three_heavy', label: 'Three-heavy' },
            ]}
            onChange={(v) => updateOffense('shotProfile', v)}
          />
          <SelectField
            label="Primary action"
            value={strategy.offense.primaryAction}
            options={[
              { value: 'pick_and_roll', label: 'Pick & roll' },
              { value: 'motion', label: 'Motion' },
              { value: 'isolation', label: 'Isolation' },
              { value: 'post', label: 'Post' },
              { value: 'transition', label: 'Transition' },
            ]}
            onChange={(v) => updateOffense('primaryAction', v)}
          />
          <SelectField
            label="Crash glass"
            value={strategy.offense.crashOffensiveGlass}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]}
            onChange={(v) => updateOffense('crashOffensiveGlass', v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">Defense</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="P&R coverage"
            value={strategy.defense.pickAndRollCoverage}
            options={[
              { value: 'drop', label: 'Drop' },
              { value: 'switch', label: 'Switch' },
              { value: 'blitz', label: 'Blitz' },
            ]}
            onChange={(v) => updateDefense('pickAndRollCoverage', v)}
          />
          <SelectField
            label="Pressure"
            value={strategy.defense.pressure}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]}
            onChange={(v) => updateDefense('pressure', v)}
          />
          <SelectField
            label="Rebounding"
            value={strategy.defense.reboundingFocus}
            options={[
              { value: 'secure_boards', label: 'Secure boards' },
              { value: 'balanced', label: 'Balanced' },
              { value: 'leak_out', label: 'Leak out' },
            ]}
            onChange={(v) => updateDefense('reboundingFocus', v)}
          />
          <SelectField
            label="Physicality"
            value={strategy.defense.physicality}
            options={[
              { value: 'conservative', label: 'Conservative' },
              { value: 'balanced', label: 'Balanced' },
              { value: 'physical', label: 'Physical' },
            ]}
            onChange={(v) => updateDefense('physicality', v)}
          />
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-display">Sim preview</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-[var(--color-muted-foreground)] space-y-1">
            {preview.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
