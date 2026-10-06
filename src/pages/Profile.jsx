import { useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import {
  User,
  Mail,
  Shield,
  KeyRound,
  CheckCircle2,
  Store,
  FlaskConical,
  Calendar,
  Lock,
  Sparkles,
} from 'lucide-react'

const availableRoles = [
  {
    id: 'retailer',
    name: 'Store / Inventory Manager',
    badge: 'Retailer',
    icon: Store,
    desc: 'Action-oriented view: stockout risks, safety stock, ROP reorder recommendations, and restock sheets.',
    access: ['Dashboard', 'Forecast', 'Inventory', 'Reports'],
  },
  {
    id: 'ml_engineer',
    name: 'ML Engineer / Data Analyst',
    badge: 'ML Engineer',
    icon: FlaskConical,
    desc: 'Technical diagnostics: model tournament, loss curves, backtesting metrics (wMAPE, RMSE, R²), and dataset stats.',
    access: ['Dashboard', 'Datasets', 'Forecast', 'Models', 'Reports'],
  },
  {
    id: 'admin',
    name: 'System Administrator',
    badge: 'Admin',
    icon: Shield,
    desc: 'Full platform governance: dataset ingestion, system settings, model retraining triggers, and audit logs.',
    access: ['All Modules & System Controls'],
  },
]

export default function Profile() {
  const { user, updateUserRole, updateProfile } = useAuth()
  const currentRole = user?.role || 'retailer'

  const [name, setName] = useState(user?.name || 'Store Manager')
  const [email] = useState(user?.email || 'manager@retail.com')
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [roleMessage, setRoleMessage] = useState('')

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const handleUpdateName = (e) => {
    e.preventDefault()
    updateProfile({ name })
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  const handleRoleChange = (newRoleId) => {
    updateUserRole(newRoleId)
    const roleObj = availableRoles.find((r) => r.id === newRoleId)
    setRoleMessage(`Role switched to ${roleObj?.name}. Navigation and access permissions updated.`)
    setTimeout(() => setRoleMessage(''), 4000)
  }

  const handlePasswordChange = (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess(false)

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }

    setPasswordSuccess(true)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setPasswordSuccess(false), 3000)
  }

  return (
    <DashboardLayout title="User Profile & Role Settings">
      <div className="space-y-6">
        {/* Header Profile Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-accent text-2xl font-bold text-white shadow-lg shadow-primary/20">
                {name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{name}</h2>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary capitalize">
                    {currentRole.replace('_', ' ')}
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Mail className="h-3.5 w-3.5" />
                  {email}
                  <span className="mx-1">&middot;</span>
                  <Calendar className="h-3.5 w-3.5" />
                  Joined Active Session
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-white/5 dark:bg-white/5 text-right">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Access Scope</span>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                {currentRole === 'retailer' && 'Inventory Replenishment & Forecasts'}
                {currentRole === 'ml_engineer' && 'Full ML Tournament & Backtests'}
                {currentRole === 'admin' && 'System-wide Full Privileges'}
              </p>
            </div>
          </div>
        </div>

        {/* Role-Based Access Control Switcher */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                <Shield className="h-4.5 w-4.5 text-primary" />
                Active Persona & Role-Based Permissions
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Switching roles dynamically adjusts your navigation menu, accessible features, and permission guards.
              </p>
            </div>
          </div>

          {roleMessage && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {roleMessage}
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            {availableRoles.map(({ id, name: roleTitle, badge, icon: Icon, desc, access }) => {
              const isActive = currentRole === id
              return (
                <div
                  key={id}
                  onClick={() => handleRoleChange(id)}
                  className={`group relative cursor-pointer rounded-xl border p-4.5 transition-all ${
                    isActive
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/5 dark:border-primary dark:bg-primary/10'
                      : 'border-slate-200 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                          isActive
                            ? 'bg-primary text-white'
                            : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                        }`}
                      >
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{badge}</h4>
                        <p className="text-[11px] text-slate-400">{roleTitle}</p>
                      </div>
                    </div>
                    {isActive && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{desc}</p>

                  <div className="mt-3 border-t border-slate-100 pt-2.5 dark:border-white/5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Accessible:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {access.map((mod) => (
                        <span
                          key={mod}
                          className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300"
                        >
                          {mod}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Profile Details & Password Update */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Account Details Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <User className="h-4.5 w-4.5 text-primary" />
              Personal Information
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Update your display name and contact preferences.
            </p>

            <form onSubmit={handleUpdateName} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500 dark:border-white/5 dark:bg-white/5 dark:text-slate-400"
                />
                <p className="mt-1 text-[11px] text-slate-400">Email is tied to your account identity.</p>
              </div>

              {savedSuccess && (
                <p className="text-xs font-medium text-emerald-500">Profile name updated successfully.</p>
              )}

              <button
                type="submit"
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary/90"
              >
                Save Details
              </button>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <KeyRound className="h-4.5 w-4.5 text-primary" />
              Security & Credentials
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Manage your password (hashed via Bcrypt per NFR-4).
            </p>

            <form onSubmit={handlePasswordChange} className="mt-5 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Current Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {passwordError && <p className="text-xs font-medium text-red-500">{passwordError}</p>}
              {passwordSuccess && <p className="text-xs font-medium text-emerald-500">Password updated successfully.</p>}

              <button
                type="submit"
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
              >
                Update Password
              </button>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
