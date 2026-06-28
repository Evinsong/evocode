import { NavLink } from 'react-router-dom'
import {
  Code2,
  BookOpen,
  History,
  Settings,
  Github,
  type LucideIcon,
} from 'lucide-react'
import { NAV_ITEMS, APP_TITLE, APP_SUBTITLE } from '@/lib/constants'
import { cn } from '@/lib/utils'

/** Icon mapping from string names to lucide-react components */
const ICON_MAP: Record<string, LucideIcon> = {
  Code2,
  BookOpen,
  History,
  Settings,
}

export function Sidebar() {
  return (
    <aside className="flex h-full flex-col border-r bg-card">
      {/* Logo / Title */}
      <div className="flex h-16 items-center gap-3 border-b px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Code2 className="h-5 w-5" />
        </div>
        <div className="hidden xl:block">
          <h1 className="text-base font-bold leading-tight">{APP_TITLE}</h1>
          <p className="text-xs text-muted-foreground">{APP_SUBTITLE}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map((item) => {
          const Icon = ICON_MAP[item.icon]
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActive
                    ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                    : 'text-muted-foreground',
                )
              }
            >
              {Icon && <Icon className="h-5 w-5 shrink-0" />}
              <span className="hidden xl:inline">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Footer: Version + GitHub */}
      <div className="border-t p-3">
        <div className="hidden xl:flex items-center justify-between text-xs text-muted-foreground">
          <span>v0.1.0 MVP</span>
          <a
            href="https://github.com/evocode/evocode"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <Github className="h-3.5 w-3.5" />
            <span>GitHub</span>
          </a>
        </div>
        <div className="flex xl:hidden justify-center">
          <a
            href="https://github.com/evocode/evocode"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <Github className="h-5 w-5" />
          </a>
        </div>
      </div>
    </aside>
  )
}
