import { Activity } from 'lucide-react'
import { recentActivity } from '../data/dashboardData'

export default function RecentActivityPanel() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      <div className="mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Activity</h3>
      </div>
      <ul className="space-y-4">
        {recentActivity.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
            <div>
              <p className="text-sm text-slate-700 dark:text-slate-300">{item.text}</p>
              <p className="text-xs text-slate-400">{item.time}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
