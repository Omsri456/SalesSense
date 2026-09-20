import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Database,
  LineChart,
  BrainCircuit,
  PackageSearch,
  FileBarChart,
  Settings,
  User,
  TrendingUp,
} from 'lucide-react'

const items = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/datasets', label: 'Datasets', icon: Database },
  { to: '/forecast', label: 'Forecast', icon: LineChart },
  { to: '/models', label: 'Models', icon: BrainCircuit },
  { to: '/inventory', label: 'Inventory', icon: PackageSearch },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/profile', label: 'Profile', icon: User },
]

export default function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6 dark:border-white/10 dark:bg-slate-900 lg:flex">
      <a href="/" className="flex items-center gap-2 px-2 font-semibold text-slate-900 dark:text-white">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
          <TrendingUp className="h-4.5 w-4.5" strokeWidth={2.5} />
        </span>
        <span className="text-lg tracking-tight">SalesSense</span>
      </a>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
              }`
            }
          >
            <Icon className="h-4.5 w-4.5" strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
        <p className="font-mono uppercase tracking-wider text-[10px] text-slate-400">Plan</p>
        <p className="mt-1 font-medium text-slate-700 dark:text-slate-200">Retailer &middot; Free tier</p>
      </div>
    </aside>
  )
}
