import { useEffect, useState } from 'react'
import { MessageSquareWarning, PackageCheck, AlertTriangle, CheckCircle2, Clock, User, Store } from 'lucide-react'
import { api } from '../services/api'

export default function RetailerFeedbackPanel() {
  const [feedbackList, setFeedbackList] = useState([])
  const [filterType, setFilterType] = useState('all')
  const [loading, setLoading] = useState(true)

  const loadFeedback = async () => {
    try {
      const data = await api.getFeedback()
      if (Array.isArray(data)) {
        setFeedbackList(data)
      }
    } catch (err) {
      console.warn('Could not load feedback:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFeedback()
  }, [])

  const filtered = feedbackList.filter((item) => {
    if (filterType === 'all') return true
    return item.feedback_type === filterType
  })

  const typeConfig = {
    flag_inaccurate_forecast: {
      label: 'Forecast Inaccuracy Flag',
      badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      icon: AlertTriangle,
    },
    report_stock_count: {
      label: 'Physical Stock Count',
      badge: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
      icon: PackageCheck,
    },
    confirmed_reorder: {
      label: 'Confirmed Reorder Placed',
      badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      icon: CheckCircle2,
    },
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageSquareWarning className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Retailer Ground-Truth Feedback & Inaccuracy Flags
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Field operational feedback from store managers for model error diagnosis and inventory auditing.
            </p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`rounded-lg px-2.5 py-1 font-medium transition ${
              filterType === 'all'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300'
            }`}
          >
            All ({feedbackList.length})
          </button>
          <button
            onClick={() => setFilterType('flag_inaccurate_forecast')}
            className={`rounded-lg px-2.5 py-1 font-medium transition ${
              filterType === 'flag_inaccurate_forecast'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300'
            }`}
          >
            Forecast Flags (
            {feedbackList.filter((f) => f.feedback_type === 'flag_inaccurate_forecast').length}
            )
          </button>
          <button
            onClick={() => setFilterType('report_stock_count')}
            className={`rounded-lg px-2.5 py-1 font-medium transition ${
              filterType === 'report_stock_count'
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300'
            }`}
          >
            Stock Counts (
            {feedbackList.filter((f) => f.feedback_type === 'report_stock_count').length}
            )
          </button>
          <button
            onClick={() => setFilterType('confirmed_reorder')}
            className={`rounded-lg px-2.5 py-1 font-medium transition ${
              filterType === 'confirmed_reorder'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300'
            }`}
          >
            Reorders (
            {feedbackList.filter((f) => f.feedback_type === 'confirmed_reorder').length}
            )
          </button>
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <p className="py-8 text-center text-xs text-slate-400">Loading ground-truth feedback...</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center dark:border-white/10">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              No operational feedback entries recorded yet.
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Retailers can log physical cycle counts, confirm reorders, or flag inaccurate forecasts directly from the Inventory table.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-80 overflow-y-auto">
            {filtered.map((item) => {
              const cfg = typeConfig[item.feedback_type] || {
                label: item.feedback_type,
                badge: 'bg-slate-100 text-slate-600 border-slate-200',
                icon: AlertTriangle,
              }
              const Icon = cfg.icon

              return (
                <div key={item.id} className="py-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-medium ${cfg.badge}`}>
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                      <span className="font-mono font-medium text-slate-700 dark:text-slate-200">
                        {item.product_id || 'All Products'}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-400">
                        <Store className="h-3 w-3" />
                        {item.store_id}
                      </span>
                    </div>

                    {item.notes && (
                      <p className="text-slate-600 dark:text-slate-300 italic pl-1">
                        &ldquo;{item.notes}&rdquo;
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {item.user_name || item.user_email}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" />
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {item.actual_stock != null && (
                      <span className="inline-block rounded-lg bg-indigo-500/10 px-2.5 py-1 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        Count: {item.actual_stock} units
                      </span>
                    )}
                    {item.reorder_quantity != null && (
                      <span className="inline-block rounded-lg bg-emerald-500/10 px-2.5 py-1 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        Reorder: +{item.reorder_quantity} units
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
