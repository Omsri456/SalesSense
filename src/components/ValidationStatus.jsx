import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { expectedColumns } from '../data/datasetData'

export default function ValidationStatus({ headers }) {
  const normalized = headers.map((h) => h.trim().toLowerCase())
  const found = expectedColumns.filter((c) => normalized.includes(c))
  const missing = expectedColumns.filter((c) => !normalized.includes(c))
  const isValid = missing.length === 0

  return (
    <div
      className={`rounded-2xl border p-4 ${
        isValid
          ? 'border-secondary/30 bg-secondary/5'
          : 'border-accent/30 bg-accent/5'
      }`}
    >
      <div className="flex items-center gap-2">
        {isValid ? (
          <CheckCircle2 className="h-4.5 w-4.5 text-secondary" />
        ) : (
          <AlertCircle className="h-4.5 w-4.5 text-accent" />
        )}
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {isValid ? 'Dataset looks valid' : 'Missing recommended columns'}
        </p>
      </div>
      <ul className="mt-3 space-y-1.5">
        {expectedColumns.map((col) => {
          const ok = normalized.includes(col)
          return (
            <li key={col} className="flex items-center gap-2 text-xs">
              {ok ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-secondary" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-accent" />
              )}
              <span className={`font-mono ${ok ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400'}`}>{col}</span>
            </li>
          )
        })}
      </ul>
      {!isValid && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Training may still run, but forecasts will be less accurate without: {missing.join(', ')}.
        </p>
      )}
    </div>
  )
}
