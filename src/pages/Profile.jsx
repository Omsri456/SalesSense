import { useState, useEffect } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
  User,
  Mail,
  Shield,
  Store,
  Moon,
  Sun,
  LogOut,
  CheckCircle2,
  Building2,
} from 'lucide-react'

export default function Profile() {
  const { user, updateProfile, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const currentRole = user?.role || 'retailer'
  const assignedStores = user?.assigned_stores || ['STORE_01']

  const [name, setName] = useState(user?.name || '')
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (user?.name) setName(user.name)
  }, [user])

  const handleUpdateName = async (e) => {
    e.preventDefault()
    setIsUpdating(true)
    try {
      await updateProfile({ name })
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    } catch {
      // handled in context
    } finally {
      setIsUpdating(false)
    }
  }

  const roleLabels = {
    retailer: 'Retail Store Manager',
    ml_engineer: 'Machine Learning Engineer',
    admin: 'Administrator',
  }

  return (
    <DashboardLayout title="User Profile">
      <div className="max-w-3xl space-y-6">
        {/* Profile Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-accent text-2xl font-bold text-white shadow-lg shadow-primary/20">
                {(name || user?.email || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {name || user?.email?.split('@')[0]}
                  </h2>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary capitalize">
                    {roleLabels[currentRole] || currentRole}
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Mail className="h-3.5 w-3.5" />
                  {user?.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 transition"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/50 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-100/50 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/40 transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Account Details & Store Assignments */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Edit Profile */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <User className="h-4 w-4 text-primary" />
              Account Details
            </h3>

            <form onSubmit={handleUpdateName} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Assigned Role
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="capitalize">{currentRole.replace('_', ' ')}</span>
                </div>
              </div>

              {savedSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Profile updated successfully.
                </div>
              )}

              <button
                type="submit"
                disabled={isUpdating}
                className="w-full rounded-xl bg-primary py-2 text-xs font-semibold text-white shadow-md shadow-primary/20 hover:bg-primary/90 transition disabled:opacity-50"
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Assigned Stores */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Building2 className="h-4 w-4 text-primary" />
              Assigned Stores
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Stores accessible under your current login credentials.
            </p>

            <div className="mt-4 space-y-2.5">
              {assignedStores.includes('*') ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400">
                  <Store className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">All Stores (Global Access)</p>
                    <p className="text-[11px] opacity-80">Full visibility across all locations</p>
                  </div>
                </div>
              ) : (
                assignedStores.map((storeId) => (
                  <div
                    key={storeId}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="flex items-center gap-2.5">
                      <Store className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{storeId}</span>
                    </div>
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      Active
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
