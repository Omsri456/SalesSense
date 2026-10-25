import { Sparkles, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import DaysCoverBulletChart from './DaysCoverBulletChart'

function MiniSparkline({ data = [], isUp = true }) {
  if (!data || data.length < 2) {
    return <div className="h-6 w-20 bg-slate-100 rounded dark:bg-slate-800" />
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const width = 80
  const height = 24

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * (width - 4) + 2
      const y = height - 2 - ((val - min) / range) * (height - 6)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const strokeColor = isUp ? '#0D9488' : '#E11D48'

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

export default function CategorySparklines({ categories = [], loading = false }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-400 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
        Loading category trends and sparklines...
      </div>
    )
  }

  if (categories.length === 0) {
    return null
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Category Velocity & Days of Cover
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            14-day demand sparklines and lead-time cover posture.
          </p>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
          14-Day Trajectory
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-mono uppercase tracking-widest text-slate-400 dark:border-white/10">
              <th className="pb-3 text-left">Category</th>
              <th className="pb-3 text-left">14D Sparkline</th>
              <th className="pb-3 text-right">Trend</th>
              <th className="pb-3 text-right">14D Revenue</th>
              <th className="pb-3 pl-6 text-left">Days of Cover Posture</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-white/5">
            {categories.map((cat) => {
              const isUp = cat.change_pct >= 0
              // Realistic cover simulation per category:
              const coverDays = cat.is_perishable ? cat.shelf_life_days * 0.8 : 12.0

              return (
                <tr key={cat.category} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                  <td className="py-3">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{cat.category}</p>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.2 text-[10px] font-medium ${
                        cat.is_perishable
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {cat.is_perishable ? `Perishable (${cat.shelf_life_days}d)` : `Stable (${cat.shelf_life_days}d)`}
                    </span>
                  </td>

                  <td className="py-3">
                    <MiniSparkline data={cat.trend_14d} isUp={isUp} />
                  </td>

                  <td className="py-3 text-right">
                    <span
                      className={`inline-flex items-center gap-1 font-mono text-xs font-semibold ${
                        isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                      }`}
                    >
                      {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {isUp ? `+${cat.change_pct}%` : `${cat.change_pct}%`}
                    </span>
                  </td>

                  <td className="py-3 text-right font-mono font-medium text-slate-700 dark:text-slate-200">
                    ${Math.round(cat.total_revenue).toLocaleString()}
                  </td>

                  <td className="py-3 pl-6">
                    <DaysCoverBulletChart
                      coverDays={coverDays}
                      leadTimeDays={cat.lead_time_days}
                      shelfLifeDays={cat.shelf_life_days}
                      isPerishable={cat.is_perishable}
                      width="w-48"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
