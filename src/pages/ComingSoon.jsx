import { Link } from 'react-router-dom'
import { Construction, ArrowLeft } from 'lucide-react'

export default function ComingSoon({ title }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-light px-6 text-center dark:bg-bg-dark">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Construction className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{title}</h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        This page is scaffolded and ready for its UI. It isn't built yet in this pass.
      </p>
      <Link
        to="/"
        className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-primary hover:text-primary dark:border-white/10 dark:text-slate-300"
      >
        <ArrowLeft className="h-4 w-4" /> Back to landing page
      </Link>
    </div>
  )
}
