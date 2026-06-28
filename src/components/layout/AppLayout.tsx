import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useSettingsStore } from '@/stores/settingsStore'

/**
 * Application layout shell with sidebar, header, and main content area.
 * Initializes WebSocket connection and loads settings on mount.
 * Responsive: sidebar collapses to icon-only bar below 1280px.
 */
export function AppLayout() {
  const loadSettings = useSettingsStore((s) => s.loadSettings)
  const { connected } = useWebSocket()

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        {/* Sidebar: full width on xl+, icon bar below */}
        <div className="w-16 shrink-0 xl:w-64">
          <Sidebar />
        </div>

        {/* Main area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header connected={connected} />
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
      <Toaster />
    </TooltipProvider>
  )
}
