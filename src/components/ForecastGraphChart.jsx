import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'
import { forecastGraph as defaultForecastGraph } from '../data/dashboardData'

export default function ForecastGraphChart({ data = defaultForecastGraph, subtitle = 'Actual vs predicted' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Forecast Graph</h3>
        <span className="text-xs font-mono text-slate-400">{subtitle}</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ left: -20, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="actual" stroke="#14B8A6" strokeWidth={2.5} dot={false} connectNulls={false} name="Actual" />
          <Line type="monotone" dataKey="predicted" stroke="#2563EB" strokeWidth={2.5} strokeDasharray="6 6" dot={false} name="Predicted" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
