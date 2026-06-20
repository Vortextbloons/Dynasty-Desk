import { PageHeader } from '@/components/layout/PageHeader'
import { PlaceholderPage } from '@/components/layout/PlaceholderPage'

export function TradeCenterPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Season"
        title="Trade Center"
        description="Build a deal. The AI rates it. Accept, reject, or counter — every accepted trade reshapes the league."
      />
      <PlaceholderPage
        title="Trade builder"
        description="Pick outgoing pieces, target a team, add incoming pieces. AI acceptance score based on value, fit, and team direction."
        milestone="Milestone 8 — Trades & Contracts"
        features={[
          'Side-by-side asset picker',
          'AI acceptance score and reasoning',
          'Salary matching check',
          'Trade finder (one-click suggestions)',
          'Pick protections and swap logic',
        ]}
      />
    </div>
  )
}
