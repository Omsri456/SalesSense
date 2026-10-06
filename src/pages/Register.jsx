import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, UserPlus, AlertCircle } from 'lucide-react'
import AuthCard from '../components/AuthCard'
import FormField from '../components/FormField'
import RoleSelector from '../components/RoleSelector'
import SocialLoginButtons from '../components/SocialLoginButtons'
import { useAuth } from '../context/AuthContext'

function validate({ name, email, password, confirmPassword }) {
  const errors = {}
  if (!name.trim()) errors.name = 'Full name is required.'
  if (!email) errors.email = 'Email is required.'
  else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Enter a valid email address.'
  if (!password) errors.password = 'Password is required.'
  else if (password.length < 6) errors.password = 'Password must be at least 6 characters.'
  if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match.'
  return errors
}

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [role, setRole] = useState('retailer')
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }))
    if (serverError) setServerError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const v = validate(form)
    setErrors(v)
    if (Object.keys(v).length > 0) return

    setSubmitting(true)
    setServerError('')
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        role,
      })
      navigate('/dashboard')
    } catch (err) {
      setServerError(err.message || 'Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard title="Create your account" subtitle="Start forecasting in a few minutes">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {serverError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}
        <FormField
          label="Full name"
          type="text"
          placeholder="Jane Doe"
          value={form.name}
          onChange={handleChange('name')}
          error={errors.name}
        />
        <FormField
          label="Email"
          type="email"
          placeholder="you@company.com"
          value={form.email}
          onChange={handleChange('email')}
          error={errors.email}
        />

        <div className="relative">
          <FormField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange('password')}
            error={errors.password}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3.5 top-9 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <FormField
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          value={form.confirmPassword}
          onChange={handleChange('confirmPassword')}
          error={errors.confirmPassword}
        />

        <RoleSelector value={role} onChange={setRole} />

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70"
        >
          <UserPlus className="h-4 w-4" />
          {submitting ? 'Creating account…' : 'Create account'}
        </button>

        <div className="relative py-2 text-center text-xs text-slate-400">
          <span className="relative bg-white/70 px-2 dark:bg-transparent">or continue with</span>
          <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-slate-200 dark:bg-white/10" />
        </div>

        <SocialLoginButtons />
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  )
}
