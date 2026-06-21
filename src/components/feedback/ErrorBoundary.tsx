import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { NavLink } from 'react-router-dom'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-[50vh] place-items-center p-8">
          <div className="text-center max-w-sm">
            <div className="mx-auto mb-4 size-12 rounded-full bg-[var(--color-surface-2)] grid place-items-center">
              <AlertTriangle className="size-6 text-[var(--color-negative)]" />
            </div>
            <h2 className="font-display text-xl mb-2 text-[var(--color-foreground)]">
              Something went wrong
            </h2>
            {this.state.error?.message && (
              <p className="text-sm text-[var(--color-muted-foreground)] mb-6">
                {this.state.error.message}
              </p>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.reset}
                className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90 transition-opacity"
              >
                Try again
              </button>
              <NavLink
                to="/"
                className="rounded-md border border-[var(--color-line-soft)] bg-[var(--color-surface-2)] px-4 py-2 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-3)] transition-colors"
              >
                Go home
              </NavLink>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
