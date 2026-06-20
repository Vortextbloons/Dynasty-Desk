import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PendingItemsListProps {
  expiringContracts: number
  teamOptions: number
  playerOptions: number
  qualifyingOffers: number
}

export function PendingItemsList({
  expiringContracts,
  teamOptions,
  playerOptions,
  qualifyingOffers,
}: PendingItemsListProps) {
  const items = [
    { label: 'Expiring contracts', count: expiringContracts },
    { label: 'Team options to decide', count: teamOptions },
    { label: 'Player options to decide', count: playerOptions },
    { label: 'Qualifying offers', count: qualifyingOffers },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Pending items</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.label} className="flex justify-between text-sm">
              <span>{item.label}</span>
              <span className="font-mono font-medium">{item.count}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
