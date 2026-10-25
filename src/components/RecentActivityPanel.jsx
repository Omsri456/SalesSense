import { Activity, Sparkles, AlertOctagon, TrendingUp, Trophy } from 'lucide-react'

const typeIconMap = {
  stockout_incident: { icon: AlertOctagon, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  model_tournament: { icon: Trophy, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  expiry_alert: { icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  category_trend: { icon: TrendingUp, color: 'text-sky-500', bg: 'bg-sky-500/10' },
}

export default function RecentActivityPanel({ items = [], title = "What Changed · Insights Feed" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
          Computed from active facts
        </span>
      </div>

      {items.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">
          No recent data shifts logged for this store selection.
        </div>
      ) : (
        <ul className="space-y-3.5">
          {items.map((item, i) => {
            const meta = typeIconMap[item.type] || { icon: Activity, color: 'text-primary', bg: 'bg-primary/10' }
            const Icon = meta.icon

            return (
              <li key={i} className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-slate-50/80 dark:hover:bg-white/5">
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${meta.bg} ${meta.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{item.text}</p>
                  <p className="mt-1 text-[11px] font-mono text-slate-400">{item.time}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
