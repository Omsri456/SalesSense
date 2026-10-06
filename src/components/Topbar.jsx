import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Bell, Moon, Sun, LogOut, User as UserIcon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { upcomingAlerts } from '../data/dashboardData'

export default function Topbar({ title }) {
  const { theme, toggleTheme } = useTheme()
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const getInitials = (name) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

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

        {isAuthenticated && user ? (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 transition-colors hover:border-primary dark:border-white/10"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                {getInitials(user.name)}
              </div>
              <span className="hidden text-xs font-medium text-slate-700 dark:text-slate-200 md:inline">
                {user.name.split(' ')[0]}
              </span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-slate-900 z-50">
                <div className="border-b border-slate-100 px-3 py-2 dark:border-white/5">
                  <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{user.name}</p>
                  <p className="text-[11px] text-slate-400 capitalize">{user.role ? user.role.replace('_', ' ') : 'Retailer'}</p>
                </div>
                <div className="py-1">
                  <Link
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
                  >
                    <UserIcon className="h-3.5 w-3.5" />
                    Profile & Persona
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Settings
                  </Link>
                </div>
                <div className="border-t border-slate-100 pt-1 dark:border-white/5">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
          >
            <UserIcon className="h-3.5 w-3.5" />
            Sign in
          </Link>
        )}
      </div>
    </header>
  )
}
