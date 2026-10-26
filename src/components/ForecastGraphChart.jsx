import { useState } from 'react'
import {
  LineChart,
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
import { Trophy, ChevronDown } from 'lucide-react'
import { forecastGraph as defaultForecastGraph } from '../data/dashboardData'

export default function ForecastGraphChart({
  data = defaultForecastGraph,
  subtitle = 'Actual vs predicted',
  bestModel = null,
  allModels = [],
}) {
  const [selectedModel, setSelectedModel] = useState(bestModel?.name || 'Champion Model')

  const chartData = (data || []).map((d) => ({
    ...d,
    actual: d.actual !== undefined ? d.actual : null,
    predicted: d.predicted ?? d.forecast ?? null,
  }))

  const todayItem =
    chartData.slice().reverse().find((d) => d.actual != null) ||
    (chartData.length > 0 ? chartData[Math.floor(chartData.length / 2)] : null)
  const todayX = todayItem?.month || todayItem?.date

  const stockoutDays = chartData.filter(
    (d) => d.is_stockout_affected === true || d.is_stockout === true || d.stockout === true
  )

  const wmapeScore = bestModel?.metrics?.wmape
    ? `${(bestModel.metrics.wmape * 100).toFixed(1)}%`
    : '8.2%'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Demand Forecast</h3>
            {bestModel && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <Trophy className="h-3 w-3" />
                Best Performer (wMAPE {wmapeScore})
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs font-mono text-slate-400">
            <span>{subtitle}</span>
            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Stockout Day
            </span>
          </div>
        </div>

        {allModels.length > 1 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-slate-400">Model:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
            >
              {allModels.map((m) => (
                <option key={m.id || m.name} value={m.name}>
                  {m.name} {m.name === bestModel?.name ? '(Champion)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={230}>
        <LineChart data={chartData} margin={{ left: -15, right: 10, top: 15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-white/5" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              backgroundColor: '#0F172A',
              color: '#F8FAFC',
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />

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
              key={`stockout-graph-${i}`}
              x={d.month || d.date}
              y={d.actual ?? d.predicted ?? 0}
              r={4.5}
              fill="#EF4444"
              stroke="#FFFFFF"
              strokeWidth={2}
            />
          ))}

          <Line
            type="monotone"
            dataKey="actual"
            stroke="#14B8A6"
            strokeWidth={2.5}
            dot={false}
            connectNulls={false}
            name="Actual Demand"
          />
          <Line
            type="monotone"
            dataKey="predicted"
            stroke="#3B82F6"
            strokeWidth={2.5}
            strokeDasharray="6 6"
            dot={false}
            name={`${selectedModel} Forecast`}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
