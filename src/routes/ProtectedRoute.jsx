import { Navigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading, register } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-light dark:bg-bg-dark">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  // If not logged in, redirect to login page
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check role authorization if restricted
  if (allowedRoles && allowedRoles.length > 0) {
    const currentRole = user.role || 'retailer'
    const isAuthorized = allowedRoles.includes(currentRole)

    if (!isAuthorized) {
      const roleLabels = {
        retailer: 'Store / Inventory Manager',
        ml_engineer: 'ML Engineer / Data Analyst',
        admin: 'Administrator',
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-bg-light px-4 py-12 dark:bg-bg-dark">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-slate-900 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <ShieldAlert className="h-7 w-7" />
            </div>

            <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
              Access Restricted
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              This module requires{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {allowedRoles.map((r) => roleLabels[r] || r).join(' or ')}
              </span>{' '}
              permissions. Your current role is{' '}
              <span className="font-semibold text-primary capitalize">
                {roleLabels[currentRole] || currentRole}
              </span>.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <Link
                to="/dashboard"
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                <ArrowLeft className="h-4 w-4" />
                Return to Dashboard
              </Link>
              <Link
                to="/profile"
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Change Role in Profile
              </Link>
            </div>
          </div>
        </div>
      )
    }
  }

  return children
}
