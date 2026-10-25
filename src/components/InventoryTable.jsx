import { ArrowUp, ArrowDown, ArrowUpDown, CheckCircle2, ShoppingCart, AlertTriangle, ShieldAlert, Sparkles } from 'lucide-react'

const statusConfig = {
  critical: { label: 'Critical', dot: 'bg-red-500', text: 'text-red-500', bg: 'bg-red-500/10' },
  low: { label: 'Low Stock', dot: 'bg-amber-500', text: 'text-amber-500', bg: 'bg-amber-500/10' },
  healthy: { label: 'Healthy', dot: 'bg-emerald-500', text: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  expiry_risk: { label: 'Expiry Risk', dot: 'bg-rose-500', text: 'text-rose-500', bg: 'bg-rose-500/10' },
  overstocked: { label: 'Overstocked', dot: 'bg-purple-500', text: 'text-purple-500', bg: 'bg-purple-500/10' },
}

const columns = [
  { key: 'name', label: 'Product', align: 'left' },
  { key: 'shelf_life_days', label: 'Shelf Life', align: 'left' },
  { key: 'stock', label: 'Stock', align: 'right' },
  { key: 'daysOfCover', label: 'Days of Cover', align: 'left' },
  { key: 'status', label: 'Status', align: 'left' },
  { key: 'waste_risk_cost', label: 'Waste Risk ($)', align: 'right' },
  { key: 'suggestedQty', label: 'Suggested Reorder', align: 'right' },
]

function SortIcon({ active, dir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 text-slate-300" />
  return dir === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
}

export default function InventoryTable({ items, sortKey, sortDir, onSort, reorderedIds, onReorder }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-white/10 dark:bg-slate-800/60">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No SKUs match your filters</p>
        <p className="mt-1 text-xs text-slate-400">Try clearing the search or switching status tabs.</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left dark:border-white/10">
              {columns.map((col) => (
                <th key={col.key} className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                  <button
                    onClick={() => onSort(col.key)}
                    className={`inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ${
                      col.align === 'right' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    {col.label}
                    <SortIcon active={sortKey === col.key} dir={sortDir} />
                  </button>
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-mono uppercase tracking-widest text-slate-400">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const statusKey = item.status in statusConfig ? item.status : (item.isExpiryRisk ? 'expiry_risk' : 'healthy')
              const cfg = statusConfig[statusKey] || statusConfig.healthy
              const isReordered = reorderedIds.has(item.id || item.product_id)

              const stockVal = item.stock ?? item.current_stock ?? 0
              const shelfLife = item.shelf_life_days || item.shelfLife || 14
              const isPerish = item.is_perishable ?? (shelfLife <= 7)
              const leadTime = item.leadTimeDays || item.lead_time_days || (isPerish ? 2 : 4)
              const cover = item.daysOfCover ?? item.days_of_cover ?? (item.daily_demand > 0 ? stockVal / item.daily_demand : 0)
              const suggested = item.suggestedQty ?? item.suggested_order_qty ?? 0
              const wasteCost = item.waste_risk_cost ?? item.wasteRiskCost ?? 0
              const wasteUnits = item.waste_risk_units ?? item.wasteRiskUnits ?? 0

              // Visual Bullet Gauge Calculations:
              // Normalized display ceiling
              const maxDisplayHorizon = isPerish ? Math.max(shelfLife * 1.3, leadTime + 6) : Math.max(cover * 1.2, leadTime + 14)
              const coverPct = Math.min(100, Math.max(2, (cover / maxDisplayHorizon) * 100))
              const leadTimePct = Math.min(95, Math.max(5, (leadTime / maxDisplayHorizon) * 100))
              const shelfLifePct = isPerish ? Math.min(100, (shelfLife / maxDisplayHorizon) * 100) : 100

              // Gauge bar color
              let barColor = 'bg-emerald-500'
              if (cover > shelfLife) barColor = 'bg-rose-500'
              else if (cover <= leadTime) barColor = 'bg-red-500'
              else if (cover <= leadTime + (item.effectiveBuffer || 3)) barColor = 'bg-amber-500'

              return (
                <tr
                  key={item.id || item.product_id}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 dark:border-white/5 dark:hover:bg-white/5"
                >
                  {/* Product */}
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{item.name || item.product_name}</p>
                    <p className="font-mono text-xs text-slate-400">
                      {item.id || item.product_id} &middot; {item.category} &middot; {item.warehouse || item.store_id}
                    </p>
                  </td>

                  {/* Shelf Life Badge */}
                  <td className="px-4 py-3.5">
                    {isPerish ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <Sparkles className="h-3 w-3" />
                        Perishable ({shelfLife}d)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-slate-800 dark:text-slate-400">
                        Stable ({shelfLife}d)
                      </span>
                    )}
                  </td>

                  {/* Current Stock */}
                  <td className="px-4 py-3.5 text-right font-mono font-medium text-slate-700 dark:text-slate-200">
                    {stockVal.toLocaleString()} units
                  </td>

                  {/* Days of Cover Visual Bullet Gauge */}
                  <td className="px-4 py-3.5">
                    <div className="w-44">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className={`font-semibold ${cover > shelfLife ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200'}`}>
                          {Number.isFinite(cover) ? `${cover.toFixed(1)}d cover` : '—'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          LT: {leadTime}d
                        </span>
                      </div>

                      {/* Bullet Gauge Track */}
                      <div className="relative mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        {/* Cover Bar */}
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                          style={{ width: `${coverPct}%` }}
                        />
                        {/* Lead Time Indicator Line */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-slate-900/40 dark:bg-white/40"
                          style={{ left: `${leadTimePct}%` }}
                          title={`Lead time: ${leadTime} days`}
                        />
                        {/* Shelf Life Marker for Perishables */}
                        {isPerish && (
                          <div
                            className="absolute top-0 bottom-0 w-1 bg-rose-500"
                            style={{ left: `${shelfLifePct}%` }}
                            title={`Shelf life expiry: ${shelfLife} days`}
                          />
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </td>

                  {/* Waste Risk ($) */}
                  <td className="px-4 py-3.5 text-right font-mono">
                    {wasteCost > 0 ? (
                      <div>
                        <span className="font-semibold text-rose-500 dark:text-rose-400">
                          ${wasteCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <p className="text-[10px] text-rose-400 dark:text-rose-500 font-sans">
                          {wasteUnits} units spoil
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300 dark:text-slate-600">$0.00</span>
                    )}
                  </td>

                  {/* Suggested Reorder */}
                  <td className="px-4 py-3.5 text-right font-mono">
                    {suggested > 0 ? (
                      <div>
                        <span className="font-semibold text-primary">+{suggested}</span>
                        {isPerish && (
                          <p className="text-[10px] text-slate-400 font-sans">Capped by shelf life</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 font-sans">Optimal</span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3.5 text-right">
                    {suggested === 0 ? (
                      <span className="text-xs text-slate-300 dark:text-slate-600">Not needed</span>
                    ) : isReordered ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1.5 text-xs font-medium text-secondary">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Placed
                      </span>
                    ) : (
                      <button
                        onClick={() => onReorder(item.id || item.product_id)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-white"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Reorder {suggested}
                      </button>
                    )}
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
