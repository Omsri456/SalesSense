import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  ReferenceDot,
} from 'recharts'

export default function ForecastChart({ data = [] }) {
  // Boundary between actual historical observations and forecast
  const todayItem = (data || []).slice().reverse().find((d) => d.actual != null) || (data && data.length > 0 ? data[Math.floor(data.length / 2)] : null)
  const todayX = todayItem?.month || todayItem?.date

  // Stockout-affected observations
  const stockoutDays = (data || []).filter(
    (d) => d.is_stockout_affected === true || d.is_stockout === true || d.stockout === true
  )

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Actual vs Predicted</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Shaded band = confidence interval · Dashed line = forecast period
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Stockout Censored
          </span>
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span className="h-2.5 w-0.5 bg-slate-400" />
            Today Divider
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ left: -20, right: 10, top: 15 }}>
          <defs>
            <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#2563EB" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
            formatter={(v, name, item) => {
              if (v === null || v === undefined) return ['—', name]
              const conf = item?.payload?.recovery_confidence != null ? Math.round(item.payload.recovery_confidence * 100) : 100
              if (item?.payload?.is_stockout_affected && name === 'Actual') {
                return [`$${Number(v).toLocaleString()} (${conf}% recovery confidence)`, 'Actual (Stockout Censored)']
              }
              return [`$${Number(v).toLocaleString()}`, name]
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />

          {todayX && (
            <ReferenceLine
              x={todayX}
              stroke="#94A3B8"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: 'Today',
                position: 'top',
                fill: '#64748B',
                fontSize: 10,
                fontWeight: 700,
              }}
            />
          )}

          {stockoutDays.map((d, i) => (
            <ReferenceDot
              key={`stockout-dot-${i}`}
              x={d.month || d.date}
              y={d.actual ?? d.predicted ?? 0}
              r={4.5}
              fill="#EF4444"
              stroke="#FFFFFF"
              strokeWidth={2}
            />
          ))}

          <Area
            type="monotone"
            dataKey="low"
            stackId="band"
            stroke="none"
            fill="transparent"
            name="Confidence low"
            legendType="none"
            connectNulls
          />
          <Area
            type="monotone"
            dataKey="bandWidth"
            stackId="band"
            stroke="none"
            fill="url(#bandFill)"
            name="Confidence range"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#14B8A6"
            strokeWidth={2.5}
            dot={false}
            connectNulls={false}
            name="Actual"
          />
          <Line
            type="monotone"
            dataKey="predicted"
            stroke="#2563EB"
            strokeWidth={2.5}
            strokeDasharray="6 6"
            dot={false}
            connectNulls
            name="Predicted"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
