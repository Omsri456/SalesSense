import { FileText, Download, Loader2 } from 'lucide-react'

export default function ReportsTable({ reports, onDownload }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      <div className="border-b border-slate-100 p-5 dark:border-white/10">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">All Reports</h3>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-white/5">
        {reports.map((r) => (
          <li key={r.id} className="flex items-center gap-4 px-5 py-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{r.name}</p>
              <p className="text-xs text-slate-400">
                {r.type} &middot; {r.format} &middot; {r.size} &middot; {r.generatedAt}
              </p>
            </div>
            {r.status === 'generating' ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating
              </span>
            ) : (
              <button
                onClick={() => onDownload(r)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:text-slate-300"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
