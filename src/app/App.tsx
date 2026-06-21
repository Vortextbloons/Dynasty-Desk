import { HashRouter } from 'react-router-dom'
import { Providers } from './providers'
import { AppRouter } from './router'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'

export function App() {
  return (
    <HashRouter>
      <Providers>
        <ErrorBoundary>
          <AppRouter />
        </ErrorBoundary>
      </Providers>
      <div id="sr-announcer" className="sr-only" aria-live="polite" />
    </HashRouter>
  )
}
