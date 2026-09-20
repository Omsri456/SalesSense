import { Search, Bell, Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { upcomingAlerts } from '../data/dashboardData'

export default function Topbar({ title }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-bg-light/80 px-6 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-bg-dark/80">
      <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h1>

      <div className="flex flex-1 items-center justify-end gap-3">
        <div className="relative hidden max-w-xs flex-1 sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search datasets, forecasts..."
            className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
          />
        </div>

        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-primary hover:text-primary dark:border-white/10 dark:text-slate-300"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {upcomingAlerts.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-white">
              {upcomingAlerts.length}
            </span>
          )}
        </button>

        <button
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-primary hover:text-primary dark:border-white/10 dark:text-slate-300"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
          OS
        </div>
      </div>
    </header>
  )
}
