import { type ReactNode } from 'react'
import { Toaster } from 'sonner'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <>
      {children}
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast:
              'bg-[var(--color-surface-2)] border border-[var(--color-line-soft)] text-[var(--color-foreground)]',
            description: 'text-[var(--color-muted-foreground)]',
          },
        }}
      />
    </>
  )
}
