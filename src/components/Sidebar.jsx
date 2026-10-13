import { NavLink, Link } from 'react-router-dom'
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
  Shield,
  Store,
  FlaskConical,
  Layers,
  Lock,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const allItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'retailer', 'ml_engineer'] },
  { to: '/dw-mining', label: 'DWM & OLAP', icon: Layers, roles: ['admin', 'retailer', 'ml_engineer'] },
  { to: '/datasets', label: 'Datasets', icon: Database, roles: ['admin', 'ml_engineer'] },
  { to: '/forecast', label: 'Forecast', icon: LineChart, roles: ['admin', 'retailer', 'ml_engineer'] },
  { to: '/models', label: 'Models', icon: BrainCircuit, roles: ['admin', 'ml_engineer'] },
  { to: '/inventory', label: 'Inventory', icon: PackageSearch, roles: ['admin', 'retailer'] },
  { to: '/reports', label: 'Reports', icon: FileBarChart, roles: ['admin', 'retailer', 'ml_engineer'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['admin', 'retailer', 'ml_engineer'] },
  { to: '/profile', label: 'Profile', icon: User, roles: ['admin', 'retailer', 'ml_engineer'] },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const currentRole = user?.role || 'retailer'

  // Filter navigation items by active user role
  const visibleItems = allItems.filter(
    (item) => !item.roles || item.roles.includes(currentRole)
  )

  const roleIcons = {
    retailer: Store,
    ml_engineer: FlaskConical,
    admin: Shield,
  }
  const RoleIcon = roleIcons[currentRole] || Store

  const scopeLabel = user?.assigned_stores?.includes('*')
    ? 'Global (*)'
    : user?.assigned_stores?.[0] || 'STORE_01'

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6 dark:border-white/10 dark:bg-slate-900 lg:flex">
      <Link to="/dashboard" className="flex items-center gap-2 px-2 font-semibold text-slate-900 dark:text-white">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-md shadow-primary/20">
          <TrendingUp className="h-4.5 w-4.5" strokeWidth={2.5} />
        </span>
        <span className="text-lg tracking-tight">SalesSense</span>
      </Link>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
              }`
            }
          >
            <Icon className="h-4.5 w-4.5" strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Verified RBAC Identity Card (Locked to Active Session) */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 font-mono uppercase tracking-wider text-[10px] text-slate-400">
            <Lock className="h-2.5 w-2.5 text-emerald-500" />
            Verified Role
          </span>
          <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
            RBAC Locked
          </span>
        </div>

        <div className="mt-2.5 flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <RoleIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-800 dark:text-slate-200 capitalize truncate text-xs">
              {currentRole.replace('_', ' ')}
            </p>
            <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
              Scope: {scopeLabel}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2.5 dark:border-white/5">
          <Link
            to="/profile"
            className="text-[11px] font-medium text-primary hover:underline"
          >
            Manage Account
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition"
            title="Log out of current session"
          >
            <LogOut className="h-3 w-3" />
            Log out
          </button>
        </div>
      </div>
    </aside>
  )
}
