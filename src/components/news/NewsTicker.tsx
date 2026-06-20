import { Link } from 'react-router-dom'
import type { NewsEvent } from '@/game/models/news'
import { Card, CardContent } from '@/components/ui/card'

export function NewsTicker({ news }: { news: NewsEvent[] }) {
  const items = news.slice(0, 3)

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted-foreground)]">
            Recent News
          </div>
          <Link to="/news" className="text-xs text-[var(--color-primary)] hover:underline">
            View all
          </Link>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">No news yet.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="text-sm">
                <div className="text-[10px] text-[var(--color-muted-foreground)]">
                  {item.date} · {item.type.replace(/_/g, ' ')}
                </div>
                <div className="font-medium">{item.headline}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
