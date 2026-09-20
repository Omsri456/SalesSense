import { TrendingUp, Code2 } from 'lucide-react'

const columns = [
  {
    title: 'Product',
    links: ['Features', 'Workflow', 'Pricing', 'Documentation'],
  },
  {
    title: 'Company',
    links: ['About', 'Contact', 'Careers'],
  },
  {
    title: 'Resources',
    links: ['Documentation', 'GitHub', 'Support'],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/40">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <a href="#top" className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                <TrendingUp className="h-4.5 w-4.5" strokeWidth={2.5} />
              </span>
              <span className="text-lg tracking-tight">SalesSense</span>
            </a>
            <p className="mt-3 max-w-xs text-sm text-slate-500 dark:text-slate-400">
              Forecasting and inventory intelligence for retailers, built on LSTM, Prophet and SARIMA.
            </p>
            <a
              href="#github"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:border-primary hover:text-primary dark:border-white/10 dark:text-slate-300"
            >
              <Code2 className="h-3.5 w-3.5" /> View on GitHub
            </a>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {col.title}
              </p>
              <ul className="mt-3 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-slate-600 transition-colors hover:text-primary dark:text-slate-300 dark:hover:text-white"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 text-xs text-slate-400 dark:border-white/10 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} SalesSense. All rights reserved.</p>
          <p className="font-mono">Built with LSTM &middot; Prophet &middot; SARIMA</p>
        </div>
      </div>
    </footer>
  )
}
