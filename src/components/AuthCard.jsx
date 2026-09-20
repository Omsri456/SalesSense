import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AuthCard({ title, subtitle, children }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-light px-6 py-12 dark:bg-bg-dark">
      <div
        className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-secondary/10 blur-3xl"
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md rounded-3xl border border-white/60 bg-white/70 p-8 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
      >
        <Link to="/" className="flex items-center justify-center gap-2 font-semibold text-slate-900 dark:text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <TrendingUp className="h-4.5 w-4.5" strokeWidth={2.5} />
          </span>
          <span className="text-lg tracking-tight">SalesSense</span>
        </Link>

        <div className="mt-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>

        <div className="mt-6">{children}</div>
      </motion.div>
    </div>
  )
}
