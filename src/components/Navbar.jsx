import { useState } from 'react'
import { motion } from 'framer-motion'
import { Moon, Sun, Menu, X, TrendingUp } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const links = [
  { label: 'Features', href: '#features' },
  { label: 'Workflow', href: '#workflow' },
  { label: 'Pricing', href: '#pricing' },
]

export default function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-bg-light/80 backdrop-blur-xl dark:border-white/10 dark:bg-bg-dark/80">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <TrendingUp className="h-4.5 w-4.5" strokeWidth={2.5} />
          </span>
          <span className="text-lg tracking-tight">SalesSense</span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-primary dark:text-slate-300 dark:hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:text-slate-300 dark:hover:text-white"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <a
            href="\login"
            className="text-sm font-medium text-slate-600 hover:text-primary dark:text-slate-300 dark:hover:text-white"
          >
            Log in
          </a>
          <a
            href="\register"
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm shadow-primary/30 transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            Get Started
          </a>
        </div>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 dark:text-slate-300 md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-slate-200 px-6 py-4 dark:border-white/10 md:hidden"
        >
          <div className="flex flex-col gap-4">
            {links.map((l) => (
              <a key={l.label} href={l.href} className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {l.label}
              </a>
            ))}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </button>
              <a href="#get-started" className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white">
                Get Started
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </header>
  )
}
