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
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const allItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'retailer', 'ml_engineer'] },
  { to: '/datasets', label: 'Datasets', icon: Database, roles: ['admin', 'ml_engineer'] },
  { to: '/forecast', label: 'Forecast', icon: LineChart, roles: ['admin', 'retailer', 'ml_engineer'] },
  { to: '/models', label: 'Models', icon: BrainCircuit, roles: ['admin', 'ml_engineer'] },
  { to: '/inventory', label: 'Inventory', icon: PackageSearch, roles: ['admin', 'retailer'] },
  { to: '/reports', label: 'Reports', icon: FileBarChart, roles: ['admin', 'retailer', 'ml_engineer'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['admin', 'retailer', 'ml_engineer'] },
  { to: '/profile', label: 'Profile', icon: User, roles: ['admin', 'retailer', 'ml_engineer'] },
]

export default function Sidebar() {
  const { user, updateUserRole } = useAuth()
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

      {/* Role Badge and Quick Persona Switcher */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center justify-between">
          <p className="font-mono uppercase tracking-wider text-[10px] text-slate-400">Active Persona</p>
          <Link
            to="/profile"
            className="text-[10px] text-primary hover:underline font-medium"
          >
            Manage
          </Link>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <RoleIcon className="h-3.5 w-3.5" />
          </div>
          <p className="font-semibold text-slate-800 dark:text-slate-200 capitalize truncate">
            {currentRole.replace('_', ' ')}
          </p>
        </div>

        {/* Quick Role Toggle Bar for Easy Evaluation */}
        <div className="mt-2.5 grid grid-cols-3 gap-1 border-t border-slate-200/60 pt-2 dark:border-white/5">
          <button
            type="button"
            onClick={() => updateUserRole('retailer')}
            title="Switch to Store/Inventory Manager role"
            className={`rounded-lg py-1 text-[10px] font-medium transition ${
              currentRole === 'retailer'
                ? 'bg-primary text-white font-semibold'
                : 'bg-white text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            Retailer
          </button>
          <button
            type="button"
            onClick={() => updateUserRole('ml_engineer')}
            title="Switch to ML Engineer role"
            className={`rounded-lg py-1 text-[10px] font-medium transition ${
              currentRole === 'ml_engineer'
                ? 'bg-primary text-white font-semibold'
                : 'bg-white text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            ML Eng
          </button>
          <button
            type="button"
            onClick={() => updateUserRole('admin')}
            title="Switch to Admin role"
            className={`rounded-lg py-1 text-[10px] font-medium transition ${
              currentRole === 'admin'
                ? 'bg-primary text-white font-semibold'
                : 'bg-white text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            Admin
          </button>
        </div>
      </div>
    </aside>
  )
}
