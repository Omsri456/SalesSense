import { useState, useMemo } from 'react'
import { Flame, Clock, AlertTriangle, Layers } from 'lucide-react'
import { chartColors } from '../lib/chartTheme'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 6 to 22

export default function HourWeekdayHeatmap({ data = [], loading = false }) {
  const [metric, setMetric] = useState('units') // 'units' | 'stockouts'
  const [hoveredCell, setHoveredCell] = useState(null)

  // Quick lookup map: "d_h" -> cell object
  const cellMap = useMemo(() => {
    const map = new Map()
    data.forEach((c) => {
      map.set(`${c.day}_${c.hour}`, c)
    })
    return map
  }, [data])

  // Compute maximums for color scaling
  const maxUnits = useMemo(() => {
    if (!data.length) return 30
    return Math.max(...data.map((c) => c.units_avg || 0), 10)
  }, [data])

  const maxStockout = useMemo(() => {
    if (!data.length) return 0.1
    return Math.max(...data.map((c) => c.stockout_rate || 0), 0.05)
  }, [data])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Hourly Demand & Stockout Heatmap
            </h3>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-mono text-primary font-semibold">
              06:00 – 22:00
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Operating window sales concentration across weekday and weekend cycles.
          </p>
        </div>

        {/* Metric Selector */}
        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-slate-900/60">
          <button
            onClick={() => setMetric('units')}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
              metric === 'units'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Sales Volume
          </button>
          <button
            onClick={() => setMetric('stockouts')}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
              metric === 'stockouts'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Stockout Hazard
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-56 items-center justify-center text-xs text-slate-400">
          Loading heatmap distribution...
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[640px]">
            {/* Hour Header */}
            <div className="grid grid-cols-[56px_repeat(17,1fr)] gap-1 text-center text-[10px] font-mono text-slate-400 pb-1">
              <span className="text-left font-semibold">Day</span>
              {HOURS.map((h) => (
                <span key={h} className="truncate">
                  {h}:00
                </span>
              ))}
            </div>

            {/* Heatmap Grid */}
            <div className="space-y-1">
              {DAYS.map((day) => (
                <div key={day} className="grid grid-cols-[56px_repeat(17,1fr)] items-center gap-1">
                  <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                    {day}
                  </span>
                  {HOURS.map((hour) => {
                    const cell = cellMap.get(`${day}_${hour}`)
                    const units = cell?.units_avg || 0
                    const stockoutRate = cell?.stockout_rate || 0

                    let bgStyle = {}
                    let hoverTitle = `${day} ${hour}:00 · ${units.toFixed(1)} units/hr`

                    if (metric === 'units') {
                      const intensity = Math.min(1, Math.max(0.08, units / maxUnits))
                      bgStyle = {
                        backgroundColor: `rgba(13, 148, 136, ${intensity.toFixed(2)})`,
                      }
                      hoverTitle += ` · Stockouts: ${(stockoutRate * 100).toFixed(1)}%`
                    } else {
                      const intensity = Math.min(1, Math.max(0.08, stockoutRate / maxStockout))
                      bgStyle = {
                        backgroundColor: `rgba(225, 29, 72, ${intensity.toFixed(2)})`,
                      }
                      hoverTitle += ` · Stockout Rate: ${(stockoutRate * 100).toFixed(1)}%`
                    }

                    return (
                      <div
                        key={hour}
                        title={hoverTitle}
                        onMouseEnter={() =>
                          setHoveredCell({
                            day,
                            hour: `${hour}:00`,
                            units,
                            stockoutRate,
                          })
                        }
                        onMouseLeave={() => setHoveredCell(null)}
                        style={bgStyle}
                        className="h-6 w-full rounded cursor-pointer transition hover:scale-110 hover:ring-2 hover:ring-primary hover:z-10 shadow-xs"
                      />
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Heatmap Footer Legend & Hover Details */}
            <div className="mt-4 flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">Intensity:</span>
                <span className="text-[10px] font-mono text-slate-400">Low</span>
                <div className="flex h-2.5 w-24 overflow-hidden rounded-full">
                  <div
                    className="h-full w-full"
                    style={{
                      background:
                        metric === 'units'
                          ? 'linear-gradient(to right, rgba(13,148,136,0.1), rgba(13,148,136,1))'
                          : 'linear-gradient(to right, rgba(225,29,72,0.1), rgba(225,29,72,1))',
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-400">Peak</span>
              </div>

              {hoveredCell ? (
                <div className="font-mono text-[11px] text-slate-700 dark:text-slate-200">
                  <strong className="text-primary">{hoveredCell.day} {hoveredCell.hour}</strong>: {hoveredCell.units.toFixed(1)} avg units ·{' '}
                  <span className={hoveredCell.stockoutRate > 0.05 ? 'text-rose-500 font-semibold' : 'text-slate-400'}>
                    {(hoveredCell.stockoutRate * 100).toFixed(1)}% stockouts
                  </span>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400 italic">
                  Hover over any hourly cell to inspect demand rate
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
