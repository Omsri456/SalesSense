import { PackageSearch, TrendingUp, Truck, Layers } from 'lucide-react'
import { inventoryItems } from '../data/inventoryData'
import { withComputed } from '../lib/inventoryMath'

const statusStyle = {
  critical: { text: 'text-red-500', bg: 'bg-red-500/10', label: 'Critical' },
  low: { text: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Low Stock' },
  healthy: { text: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Healthy' },
}

export default function ProductSnapshotCard({ sku, products = [] }) {
  if (sku === 'all') {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-400">
        <PackageSearch className="h-5 w-5 shrink-0 text-slate-400" />
        <span>
          Showing aggregate data across all products. Pick a specific product or category above for focused intelligence.
        </span>
      </div>
    )
  }

  if (sku.startsWith('cat:')) {
    const categoryName = sku.split('cat:')[1]
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-slate-700 dark:border-primary/20 dark:bg-primary/10 dark:text-slate-300">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Category Rollup: {categoryName}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Displaying rolled-up warehouse demand, stockouts, and tournament forecast for all constituent {categoryName} items. Select a specific SKU to inspect item-level buffer stock and replenishment.
          </p>
        </div>
      </div>
    )
  }

  // Look up item in dynamic products or legacy inventoryItems
  const dynamicItem = products.find((p) => p.value === sku)
  const legacyItem = inventoryItems.find((i) => i.id === sku)

  const item = dynamicItem
    ? {
        id: dynamicItem.value,
        name: dynamicItem.label,
        category: dynamicItem.category || 'General',
        warehouse: 'Warehouse A',
        stock: dynamicItem.currentStock ?? 45,
        dailySales: Math.max(1, Math.round((dynamicItem.reorderPoint || 30) / (dynamicItem.leadTimeDays || 3))),
        leadTimeDays: dynamicItem.leadTimeDays || 3,
        unitCost: dynamicItem.unitCost || 5.0,
      }
    : legacyItem

  if (!item) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-400 dark:border-white/10 dark:bg-slate-800/60">
        No inventory record found for {sku} yet.
      </div>
    )
  }

  const computed = withComputed(item, 3)
  const st = statusStyle[computed.status] || statusStyle.healthy

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.name}</p>
          <p className="font-mono text-xs text-slate-400">
            {item.id} &middot; {item.category} &middot; {item.warehouse}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${st.bg} ${st.text}`}>
          {st.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
          <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-400">
            <Layers className="h-3 w-3" /> Stock
          </p>
          <p className="mt-1 font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">{item.stock} units</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
          <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-400">
            <TrendingUp className="h-3 w-3" /> Daily Sales
          </p>
          <p className="mt-1 font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">{item.dailySales}/day</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
          <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-400">
            <Truck className="h-3 w-3" /> Lead Time
          </p>
          <p className="mt-1 font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">{item.leadTimeDays}d</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Days to Stockout</p>
          <p className="mt-1 font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">
            {Number.isFinite(computed.daysToStockout) ? `${computed.daysToStockout.toFixed(1)}d` : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}
