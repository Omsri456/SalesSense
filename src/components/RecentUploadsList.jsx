import { FileText, CheckCircle2, AlertTriangle } from 'lucide-react'

export default function RecentUploadsList({ uploads }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Recent Uploads</h3>
      <ul className="divide-y divide-slate-100 dark:divide-white/5">
        {uploads.map((u) => (
          <li key={u.name} className="flex items-center gap-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{u.name}</p>
              <p className="text-xs text-slate-400">
                {u.size} &middot; {u.rows.toLocaleString()} rows &middot; {u.uploaded}
              </p>
            </div>
            {u.status === 'valid' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-secondary" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-accent" />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
