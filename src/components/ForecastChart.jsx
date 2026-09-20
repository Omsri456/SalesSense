import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function ForecastChart({ data }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Actual vs Predicted</h3>
        <span className="text-xs font-mono text-slate-400">Shaded band = confidence range</span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ left: -20, right: 10 }}>
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
            formatter={(v, name) =>
              v === null || v === undefined ? ['—', name] : [`$${Number(v).toLocaleString()}`, name]
            }
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
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
          <Line type="monotone" dataKey="actual" stroke="#14B8A6" strokeWidth={2.5} dot={false} connectNulls={false} name="Actual" />
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
