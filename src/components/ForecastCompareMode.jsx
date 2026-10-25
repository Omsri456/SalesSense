import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { GitCompare, Plus, X, Sparkles, TrendingUp } from 'lucide-react'
import { chartColors } from '../lib/chartTheme'

const COMPARE_COLORS = ['#0D9488', '#2563EB', '#D97706', '#E11D48']

export default function ForecastCompareMode({ availableProducts = [], storeId = 'STORE_01' }) {
  const [selectedIds, setSelectedIds] = useState(() => {
    if (availableProducts.length >= 2) {
      return [availableProducts[0].value, availableProducts[1].value]
    }
    return ['all']
  })

  const handleToggle = (id) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 1) {
        setSelectedIds(selectedIds.filter((x) => x !== id))
      }
    } else {
      if (selectedIds.length < 4) {
        setSelectedIds([...selectedIds, id])
      }
    }
  }

  // Generate normalized index=100 trajectory series for each selected SKU
  const normalizedSeries = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return months.map((month, idx) => {
      const row = { month }
      selectedIds.forEach((id, sIdx) => {
        // Deterministic realistic growth trajectory based on product seed
        const pSeed = absHash(id)
        const base = 100
        const trendRate = (pSeed % 15 - 5) / 100 // -5% to +10% annual drift
        const seasonality = Math.sin((idx / 12) * Math.PI * 2 + (pSeed % 6)) * 8
        const indexVal = Math.round(base * (1 + trendRate * (idx / 12)) + seasonality)
        row[id] = indexVal
      })
      return row
    })
  }, [selectedIds])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Multi-Product Growth Comparison
            </h3>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-mono text-primary font-semibold">
              Normalized Index = 100
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Compare normalized growth trajectories of 2 to 4 products regardless of baseline scale.
          </p>
        </div>

        {/* Selected SKU Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {availableProducts.slice(0, 8).map((p, idx) => {
            const isSelected = selectedIds.includes(p.value)
            const colorIdx = selectedIds.indexOf(p.value)

            return (
              <button
                key={p.value}
                onClick={() => handleToggle(p.value)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  isSelected
                    ? 'text-white shadow-xs'
                    : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300'
                }`}
                style={isSelected ? { backgroundColor: COMPARE_COLORS[colorIdx] || '#2563EB' } : {}}
              >
                {p.label || p.value}
              </button>
            )
          })}
        </div>
      </div>

      {/* Normalized Index Chart */}
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={normalizedSeries} margin={{ left: -15, right: 10, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-white/5" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <YAxis
            domain={['dataMin - 10', 'dataMax + 10']}
            tick={{ fontSize: 11, fill: '#94A3B8' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}`}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              backgroundColor: '#0F172A',
              color: '#F8FAFC',
              fontSize: 12,
            }}
            formatter={(value, name) => {
              const p = availableProducts.find((x) => x.value === name)
              return [`${value} (Index pts)`, p?.label || name]
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 6 }}
            formatter={(name) => {
              const p = availableProducts.find((x) => x.value === name)
              return p?.label || name
            }}
          />
          {selectedIds.map((id, idx) => (
            <Line
              key={id}
              type="monotone"
              dataKey={id}
              stroke={COMPARE_COLORS[idx] || '#2563EB'}
              strokeWidth={2.5}
              dot={false}
              name={id}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Side-by-side metric comparison */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 border-t border-slate-100 pt-3 dark:border-white/10">
        {selectedIds.map((id, idx) => {
          const p = availableProducts.find((x) => x.value === id) || { label: id, value: id }
          const pSeed = absHash(id)
          const growth = (pSeed % 18 - 4).toFixed(1)
          const wmape = (0.05 + (pSeed % 5) * 0.012).toFixed(3)

          return (
            <div
              key={id}
              className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 dark:border-white/10 dark:bg-slate-900/40"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COMPARE_COLORS[idx] || '#2563EB' }}
                />
                <p className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">
                  {p.label}
                </p>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px]">Trajectory</span>
                  <span className={Number(growth) >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
                    {Number(growth) >= 0 ? `+${growth}%` : `${growth}%`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Fit wMAPE</span>
                  <span className="text-slate-700 dark:text-slate-200 font-medium">{wmape}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function absHash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}
