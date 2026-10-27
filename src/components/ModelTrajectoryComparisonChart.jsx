import { useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import { Activity, Star, Eye } from 'lucide-react'

export default function ModelTrajectoryComparisonChart({
  trajectory = [],
  championName = 'BiLSTM',
  models = [],
}) {
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'sarima' | 'prophet' | 'lstm'

  // Model definitions matching design palette
  const modelDefs = [
    {
      key: 'sarima',
      name: 'SARIMA',
      type: 'Statistical (2,1,2)(1,1,1,12)',
      color: '#8B5CF6', // Purple
      dash: '4 4',
    },
    {
      key: 'prophet',
      name: 'Prophet',
      type: 'Additive Decomposed',
      color: '#06B6D4', // Cyan
      dash: '6 3',
    },
    {
      key: 'lstm',
      name: 'LSTM',
      type: 'Bidirectional LSTM Neural Net',
      color: '#10B981', // Emerald
      dash: '0',
    },
  ]

  // Detect champion
  const champKey = (championName || 'lstm').toLowerCase().includes('sarima')
    ? 'sarima'
    : (championName || 'lstm').toLowerCase().includes('prophet')
    ? 'prophet'
    : 'lstm'

  if (!trajectory || trajectory.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Model Trajectory Comparison (Holdout Evaluation)
          </h3>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Holdout trajectory data will appear after model evaluation is complete.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      {/* Header and Controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Model Trajectory Comparison (Holdout Evaluation)
            </h3>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              Live Verified Lines
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Overlays actual observed demand against authentic SARIMA, Prophet, and LSTM predictions over the 80/20 chronological holdout window.
          </p>
        </div>

        {/* Focus Filter Pills */}
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              activeFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            All Overlaid
          </button>
          {modelDefs.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setActiveFilter(m.key)}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
                activeFilter === m.key
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: m.color }}
              />
              {m.name}
              {m.key === champKey && (
                <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Trajectory Recharts LineChart */}
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={trajectory} margin={{ left: -15, right: 15, top: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#94A3B8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94A3B8' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '1px solid #E2E8F0',
              fontSize: 12,
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            formatter={(value, name) => {
              if (value == null) return ['—', name]
              const labelMap = {
                actual: 'Actual Demand',
                sarima: 'SARIMA Prediction',
                prophet: 'Prophet Prediction',
                lstm: 'LSTM Prediction',
              }
              const display = labelMap[name] || name
              return [`${Number(value).toLocaleString()} units`, display]
            }}
            labelFormatter={(label) => `Holdout Date: ${label}`}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => {
              if (value === 'actual') {
                return (
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Actual Demand (Ground Truth)
                  </span>
                )
              }
              const def = modelDefs.find((m) => m.key === value)
              const isChamp = value === champKey
              return (
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {def?.name || value}{' '}
                  {isChamp ? (
                    <span className="ml-1 inline-flex items-center gap-0.5 rounded-sm bg-emerald-500/10 px-1 py-0.2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      ★ Champion
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">({def?.type?.split(' ')[0]})</span>
                  )}
                </span>
              )
            }}
          />

          {/* Actual Observed Demand Line */}
          <Line
            type="monotone"
            dataKey="actual"
            name="actual"
            stroke="#1E293B"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#1E293B' }}
            activeDot={{ r: 5 }}
          />

          {/* SARIMA Line */}
          {(activeFilter === 'all' || activeFilter === 'sarima') && (
            <Line
              type="monotone"
              dataKey="sarima"
              name="sarima"
              stroke="#8B5CF6"
              strokeWidth={champKey === 'sarima' ? 3.5 : 2}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 5 }}
            />
          )}

          {/* Prophet Line */}
          {(activeFilter === 'all' || activeFilter === 'prophet') && (
            <Line
              type="monotone"
              dataKey="prophet"
              name="prophet"
              stroke="#06B6D4"
              strokeWidth={champKey === 'prophet' ? 3.5 : 2}
              strokeDasharray="6 3"
              dot={false}
              activeDot={{ r: 5 }}
            />
          )}

          {/* LSTM Line */}
          {(activeFilter === 'all' || activeFilter === 'lstm') && (
            <Line
              type="monotone"
              dataKey="lstm"
              name="lstm"
              stroke="#10B981"
              strokeWidth={champKey === 'lstm' ? 3.5 : 2}
              dot={false}
              activeDot={{ r: 5 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Insight Footer */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 text-slate-400" />
          <span>
            Champion model (<strong className="text-emerald-600 dark:text-emerald-400">{modelDefs.find((m) => m.key === champKey)?.name}</strong>) is rendered with a bold stroke.
          </span>
        </div>
        <div className="font-mono text-[11px] text-slate-400">
          Evaluated Chronologically · Zero Data Leakage
        </div>
      </div>
    </div>
  )
}
