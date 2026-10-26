import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { AlertCircle } from 'lucide-react'
import { chartColors } from '../lib/chartTheme'

export default function SalesTrendChart({ data = [], subtitle = 'Observed sales vs latent demand' }) {
  const chartData = (data || []).map((d) => {
    const actual = d.sales ?? d.actual ?? 0
    const latent = d.latent_demand ?? d.latentDemand ?? (d.lost_sales ? actual + d.lost_sales : actual)
    const lost = Math.max(0, latent - actual)
    return {
      month: d.month,
      actual,
      latent,
      lost,
      recovery_confidence: d.recovery_confidence,
    }
  })

  const hasLostSales = chartData.some((d) => d.lost > 0)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Sales & Demand Recovery</h3>
            {hasLostSales && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-3 w-3" />
                Lost sales due to stockouts
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs font-mono text-slate-400">{subtitle}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={230}>
        <AreaChart data={chartData} margin={{ left: -15, right: 10, top: 5, bottom: 5 }}>
          <defs>
            {/* Shaded actual sales gradient */}
            <linearGradient id="actualSalesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColors.actualFill} stopOpacity={0.4} />
              <stop offset="100%" stopColor={chartColors.actualFill} stopOpacity={0.02} />
            </linearGradient>

            {/* Shaded lost sales / unconstrained gap gradient */}
            <linearGradient id="latentDemandFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColors.unconstrained} stopOpacity={0.3} />
              <stop offset="100%" stopColor={chartColors.unconstrained} stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-white/5" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: chartColors.textMuted }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: chartColors.textMuted }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              backgroundColor: '#0F172A',
              color: '#F8FAFC',
              fontSize: 12,
            }}
            formatter={(value, name, item) => {
              if (name === 'latent') {
                const conf = item?.payload?.recovery_confidence != null ? Math.round(item.payload.recovery_confidence * 100) : 100
                return [`${value.toLocaleString()} units (${conf}% confidence)`, 'Recovered Latent Demand']
              }
              if (name === 'actual') return [`${value.toLocaleString()} units`, 'Observed Sales']
              return [value, name]
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 6 }}
            formatter={(value) => {
              if (value === 'latent') return 'Unconstrained Demand (Censoring Recovery)'
              if (value === 'actual') return 'Observed Sales'
              return value
            }}
          />

          {/* Unconstrained Latent Demand Area (shows the upper ceiling) */}
          <Area
            type="monotone"
            dataKey="latent"
            stroke={chartColors.unconstrained}
            strokeWidth={2}
            strokeDasharray="4 4"
            fill="url(#latentDemandFill)"
            name="latent"
          />

          {/* Observed Sales Area */}
          <Area
            type="monotone"
            dataKey="actual"
            stroke={chartColors.actual}
            strokeWidth={2.5}
            fill="url(#actualSalesFill)"
            name="actual"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
