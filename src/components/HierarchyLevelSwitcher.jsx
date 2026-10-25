import { useState } from 'react'
import { Layers, ChevronRight, ChevronDown, Package, Sparkles } from 'lucide-react'

const HIERARCHY_LEVELS = [
  { id: 'sku', label: 'SKU (Item)', desc: 'Lowest grain: 18 distinct products' },
  { id: 'subcategory', label: 'Subcategory', desc: 'Second category level' },
  { id: 'category', label: 'Category', desc: 'First category level (Produce, Meat, Dairy, etc.)' },
  { id: 'group', label: 'Group', desc: 'Highest grain: Fresh vs Ambient Management Groups' },
]

export default function HierarchyLevelSwitcher({
  level = 'category',
  onLevelChange,
  items = [],
  loading = false,
}) {
  const [expandedId, setExpandedId] = useState(null)

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      {/* Header & Level Selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Kimball Star Schema Hierarchy Explorer
            </h3>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-mono text-primary font-semibold">
              DimProduct Rollup / Drilldown
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Switch grain from Management Group down to individual SKU to inspect aggregation dynamics.
          </p>
        </div>

        {/* Level Tabs */}
        <div className="flex flex-wrap items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-slate-900/60">
          {HIERARCHY_LEVELS.map((lvl) => (
            <button
              key={lvl.id}
              onClick={() => {
                onLevelChange(lvl.id)
                setExpandedId(null)
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                level === lvl.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {lvl.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-slate-400">
          Aggregating facts across Kimball hierarchy...
        </div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">
          No records found at this hierarchy level.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-mono uppercase tracking-widest text-slate-400 dark:border-white/10">
                <th className="pb-2 text-left">Hierarchy Node</th>
                <th className="pb-2 text-right">Gross Revenue</th>
                <th className="pb-2 text-right">Units Sold</th>
                <th className="pb-2 text-right">Lost Sales Estimate</th>
                <th className="pb-2 text-right">Constituent SKUs</th>
                <th className="pb-2 text-center">Drilldown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
              {items.map((item) => {
                const isExpanded = expandedId === item.id
                const hasChildren = item.constituent_skus && item.constituent_skus.length > 0 && level !== 'sku'

                return (
                  <tr key={item.id} className="group">
                    <td colSpan={6} className="p-0">
                      <div
                        onClick={() => hasChildren && toggleExpand(item.id)}
                        className={`flex items-center justify-between py-3 px-2 rounded-xl transition ${
                          hasChildren ? 'cursor-pointer hover:bg-slate-50/80 dark:hover:bg-white/5' : ''
                        }`}
                      >
                        <div className="w-1/4 flex items-center gap-2">
                          {hasChildren && (
                            <span className="text-slate-400">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </span>
                          )}
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-100">{item.name}</p>
                            <p className="text-[11px] font-mono text-slate-400">ID: {item.id}</p>
                          </div>
                        </div>

                        <div className="w-1/6 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                          ${Math.round(item.total_revenue).toLocaleString()}
                        </div>

                        <div className="w-1/6 text-right font-mono text-slate-600 dark:text-slate-300">
                          {item.units_sold.toLocaleString()} units
                        </div>

                        <div className="w-1/6 text-right font-mono">
                          {item.lost_revenue_estimate > 0 ? (
                            <span className="text-rose-500 font-semibold">
                              ${Math.round(item.lost_revenue_estimate).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">$0</span>
                          )}
                        </div>

                        <div className="w-1/6 text-right font-mono text-xs text-slate-500 dark:text-slate-400">
                          {item.sku_count} {item.sku_count === 1 ? 'SKU' : 'SKUs'}
                        </div>

                        <div className="w-1/12 text-center">
                          {hasChildren ? (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              {isExpanded ? 'Collapse' : 'Inspect SKUs'}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-300 dark:text-slate-600">Leaf Grain</span>
                          )}
                        </div>
                      </div>

                      {/* Drilldown Sub-table */}
                      {isExpanded && item.constituent_skus && (
                        <div className="my-2 ml-6 mr-2 rounded-xl border border-primary/20 bg-primary/5 p-3 dark:border-primary/30 dark:bg-primary/10">
                          <p className="mb-2 text-xs font-mono uppercase tracking-wider text-primary font-bold">
                            Constituent SKUs inside {item.name}:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {item.constituent_skus.map((sku) => (
                              <div
                                key={sku.product_id}
                                className="rounded-lg border border-slate-200/80 bg-white p-2.5 shadow-2xs dark:border-white/10 dark:bg-slate-800"
                              >
                                <div className="flex items-center justify-between">
                                  <p className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">
                                    {sku.product_name}
                                  </p>
                                  <span className="font-mono text-xs font-semibold text-primary">
                                    ${Math.round(sku.revenue).toLocaleString()}
                                  </span>
                                </div>
                                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                                  <span>{sku.product_id} · ${sku.unit_price}</span>
                                  <span>{sku.shelf_life_days}d shelf life</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
