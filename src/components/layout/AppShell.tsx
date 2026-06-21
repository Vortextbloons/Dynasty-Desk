import { type ReactNode, useState } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileSidebar } from './MobileSidebar'
import { SimProgressOverlay } from '@/components/feedback/SimProgressOverlay'
import { LiveGameSimOverlay } from '@/components/feedback/LiveGameSimOverlay'
import { SaveIndicator } from '@/components/feedback/SaveIndicator'
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay'

interface AppShellProps {
  children: ReactNode
  hideChrome?: boolean
}

export function AppShell({ children, hideChrome = false }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  if (hideChrome) {
    return <main className="min-h-screen">{children}</main>
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <MobileSidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <SaveIndicator />
        <Topbar onMenuToggle={() => setMobileNavOpen(true)} />
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-5 py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
      <SimProgressOverlay />
      <LiveGameSimOverlay />
      <TutorialOverlay />
    </div>
  )
}
