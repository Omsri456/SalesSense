import { AlertTriangle, Info, AlertOctagon } from 'lucide-react'
import { upcomingAlerts } from '../data/dashboardData'

const levelConfig = {
  warning: { icon: AlertTriangle, color: 'text-accent', bg: 'bg-accent/10' },
  info: { icon: Info, color: 'text-primary', bg: 'bg-primary/10' },
  critical: { icon: AlertOctagon, color: 'text-red-500', bg: 'bg-red-500/10' },
}

export default function UpcomingAlertsPanel() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Upcoming Alerts</h3>
      <ul className="space-y-3">
        {upcomingAlerts.map((alert, i) => {
          const cfg = levelConfig[alert.level]
          const Icon = cfg.icon
          return (
            <li key={i} className={`flex items-start gap-3 rounded-xl p-3 ${cfg.bg}`}>
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${cfg.color}`} />
              <p className="text-sm text-slate-700 dark:text-slate-200">{alert.text}</p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
