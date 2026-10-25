import { AlertTriangle, Info, AlertOctagon, CheckCircle2 } from 'lucide-react'

const levelConfig = {
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  info: { icon: Info, color: 'text-primary', bg: 'bg-primary/10' },
  critical: { icon: AlertOctagon, color: 'text-rose-500', bg: 'bg-rose-500/10' },
}

export default function UpcomingAlertsPanel({ alerts = [] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Upcoming Alerts</h3>
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
          Threshold monitoring
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="h-6 w-6 text-emerald-500/80 mb-2" />
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">No active stock or shelf-life hazards</p>
          <p className="text-[11px] text-slate-400">All inventory items are operating within safety buffers.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {alerts.map((alert, i) => {
            const cfg = levelConfig[alert.level] || levelConfig.info
            const Icon = cfg.icon
            return (
              <li key={i} className={`flex items-start gap-3 rounded-xl p-3 ${cfg.bg}`}>
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${cfg.color}`} />
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-snug">{alert.text}</p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
