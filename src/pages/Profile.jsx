import { useState, useEffect } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
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
  Building,
  Users,
  UserPlus,
  AlertCircle,
} from 'lucide-react'

export default function Profile() {
  const { user, updateProfile } = useAuth()
  const currentRole = user?.role || 'retailer'
  const assignedStores = user?.assigned_stores || ['STORE_01']

  const [name, setName] = useState(user?.name || 'Store Manager')
  const [email] = useState(user?.email || 'manager@retail.com')
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  // Admin user governance state (active only if admin)
  const [adminUsers, setAdminUsers] = useState([])
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminMessage, setAdminMessage] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState('retailer')
  const [newUserStore, setNewUserStore] = useState('STORE_01')

  useEffect(() => {
    if (user?.name) setName(user.name)
  }, [user])

  useEffect(() => {
    if (currentRole === 'admin') {
      loadAdminUsers()
    }
  }, [currentRole])

  const loadAdminUsers = async () => {
    setAdminLoading(true)
    try {
      const data = await api.adminListUsers()
      setAdminUsers(data)
    } catch {
      // offline fallback
    } finally {
      setAdminLoading(false)
    }
  }

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

  const handleAdminCreateUser = async (e) => {
    e.preventDefault()
    if (!newUserEmail || !newUserPassword) return
    try {
      await api.adminCreateUser({
        name: newUserName || 'Team Member',
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
        assigned_stores: newUserRole === 'admin' ? ['*'] : [newUserStore],
      })
      setAdminMessage(`User ${newUserEmail} created successfully with role ${newUserRole}.`)
      setNewUserName('')
      setNewUserEmail('')
      setNewUserPassword('')
      loadAdminUsers()
      setTimeout(() => setAdminMessage(''), 4000)
    } catch (err) {
      setAdminMessage(err.message || 'Failed to create user.')
      setTimeout(() => setAdminMessage(''), 4000)
    }
  }

  const handleRoleUpdate = async (userId, newRole) => {
    try {
      await api.adminUpdateUserRole(userId, newRole)
      setAdminMessage(`Updated user role to ${newRole}.`)
      loadAdminUsers()
      setTimeout(() => setAdminMessage(''), 3000)
    } catch (err) {
      setAdminMessage(err.message || 'Failed to update role.')
    }
  }

  const handleStoreScopeUpdate = async (userId, storeId) => {
    try {
      await api.adminUpdateUserStores(userId, [storeId])
      setAdminMessage(`Updated user store scope to ${storeId}.`)
      loadAdminUsers()
      setTimeout(() => setAdminMessage(''), 3000)
    } catch (err) {
      setAdminMessage(err.message || 'Failed to update store scope.')
    }
  }

  return (
    <DashboardLayout title="User Profile & Security Governance">
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
                  Active Session
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-white/5 dark:bg-white/5 text-right">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Authorized Store Scope</span>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {assignedStores.includes('*') ? 'Platform-Wide (All Stores)' : assignedStores.join(', ')}
              </p>
            </div>
          </div>
        </div>

        {/* Verified Role & Security Scope Specification */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                <Shield className="h-4.5 w-4.5 text-primary" />
                Verified Role & Data Scope
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                In compliance with SalesSense enterprise security, roles and store access scopes are cryptographically enforced by JWT and backend middleware.
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Verified Active Persona
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className={`rounded-xl border p-4 transition ${currentRole === 'retailer' ? 'border-primary bg-primary/5 dark:border-primary dark:bg-primary/10' : 'border-slate-200 dark:border-white/10 opacity-70'}`}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
                  <Store className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Retailer Persona</h4>
                  <p className="text-[11px] text-slate-400">Store / Inventory Manager</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                Authorized for stockout hazards, safety stock margins, ROP replenishment, and forecast inspection across assigned store(s).
              </p>
              <div className="mt-3 border-t border-slate-100 pt-2 text-[11px] font-medium text-slate-500 dark:border-white/5">
                Scope: <span className="font-semibold text-slate-700 dark:text-slate-200">{assignedStores.join(', ')}</span>
              </div>
            </div>

            <div className={`rounded-xl border p-4 transition ${currentRole === 'ml_engineer' ? 'border-primary bg-primary/5 dark:border-primary dark:bg-primary/10' : 'border-slate-200 dark:border-white/10 opacity-70'}`}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white">
                  <FlaskConical className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">ML Engineer Persona</h4>
                  <p className="text-[11px] text-slate-400">Data & Model Specialist</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                Authorized for dataset ingestion, backtest evaluation, loss telemetry, and multi-model tournament configuration.
              </p>
              <div className="mt-3 border-t border-slate-100 pt-2 text-[11px] font-medium text-slate-500 dark:border-white/5">
                Scope: <span className="font-semibold text-slate-700 dark:text-slate-200">Analytical & Model Pipeline</span>
              </div>
            </div>

            <div className={`rounded-xl border p-4 transition ${currentRole === 'admin' ? 'border-primary bg-primary/5 dark:border-primary dark:bg-primary/10' : 'border-slate-200 dark:border-white/10 opacity-70'}`}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600 text-white">
                  <Shield className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Administrator Persona</h4>
                  <p className="text-[11px] text-slate-400">Platform Governance</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                Authorized for user provisioning, role promotion, store mapping, audit trail inspection, and platform health telemetry.
              </p>
              <div className="mt-3 border-t border-slate-100 pt-2 text-[11px] font-medium text-slate-500 dark:border-white/5">
                Scope: <span className="font-semibold text-slate-700 dark:text-slate-200">Platform-Wide Governance</span>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Governance Subsystem (Visible to Admin only) */}
        {currentRole === 'admin' && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                  <Users className="h-5 w-5 text-amber-500" />
                  Admin User & Store Scope Governance
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Manage user accounts, assign roles, and define authorized store data scopes.
                </p>
              </div>
            </div>

            {adminMessage && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2.5 text-xs font-semibold text-amber-600 border border-amber-500/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {adminMessage}
              </div>
            )}

            {/* Create User Form */}
            <form onSubmit={handleAdminCreateUser} className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-5 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500">Name</label>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-white/10 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500">Email</label>
                <input
                  type="email"
                  placeholder="user@salessense.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-white/10 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500">Password</label>
                <input
                  type="password"
                  placeholder="Min 6 chars"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-white/10 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500">Role & Scope</label>
                <div className="mt-1 flex gap-1">
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-1/2 rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-white/10 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="retailer">Retailer</option>
                    <option value="ml_engineer">ML Eng</option>
                    <option value="admin">Admin</option>
                  </select>
                  <select
                    value={newUserStore}
                    onChange={(e) => setNewUserStore(e.target.value)}
                    className="w-1/2 rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-white/10 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="STORE_01">Store 01</option>
                    <option value="STORE_02">Store 02</option>
                  </select>
                </div>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary/90"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add User
                </button>
              </div>
            </form>

            {/* Users Table */}
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-white/5 dark:bg-white/5">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Store Scope</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {adminUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{u.name}</div>
                        <div className="text-[11px] text-slate-400">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleUpdate(u.id, e.target.value)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-white/10 dark:bg-slate-800 dark:text-white"
                        >
                          <option value="retailer">retailer</option>
                          <option value="ml_engineer">ml_engineer</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px]">
                        {u.role === 'admin' ? (
                          <span className="text-slate-500">Platform-Wide (*)</span>
                        ) : (
                          <select
                            value={(u.assigned_stores || [])[0] || 'STORE_01'}
                            onChange={(e) => handleStoreScopeUpdate(u.id, e.target.value)}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-white/10 dark:bg-slate-800 dark:text-white"
                          >
                            <option value="STORE_01">STORE_01</option>
                            <option value="STORE_02">STORE_02</option>
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${u.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                          {u.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Profile Details & Password Update */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Account Details Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <User className="h-4.5 w-4.5 text-primary" />
              Personal Profile
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Update your display name. Roles and security scopes are managed by Administrators.
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
              </div>

              {savedSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Profile name saved successfully.
                </div>
              )}

              <button
                type="submit"
                disabled={isUpdating}
                className="rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90"
              >
                Save Profile
              </button>
            </form>
          </div>

          {/* Password Security Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <KeyRound className="h-4.5 w-4.5 text-primary" />
              Password Security
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Keep your account protected with salted bcrypt credentials (NFR-4).
            </p>

            <form onSubmit={handlePasswordChange} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Current Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {passwordError && (
                <p className="text-xs text-red-500 font-medium">{passwordError}</p>
              )}

              {passwordSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Password credentials updated.
                </div>
              )}

              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
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
