import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { salesTrend as defaultSalesTrend } from '../data/dashboardData'

export default function SalesTrendChart({ data = defaultSalesTrend, subtitle = 'Last 12 months' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Sales Trend</h3>
        <span className="text-xs font-mono text-slate-400">{subtitle}</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ left: -20, right: 10 }}>
          <defs>
            <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
            formatter={(v) => [`$${v.toLocaleString()}`, 'Sales']}
          />
          <Area type="monotone" dataKey="sales" stroke="#2563EB" strokeWidth={2.5} fill="url(#salesFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
