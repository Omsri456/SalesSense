import { PackageSearch, TrendingUp, Truck, Layers } from 'lucide-react'
import { inventoryItems } from '../data/inventoryData'
import { withComputed } from '../lib/inventoryMath'

const statusStyle = {
  critical: { text: 'text-red-500', bg: 'bg-red-500/10', label: 'Critical' },
  low: { text: 'text-accent', bg: 'bg-accent/10', label: 'Low Stock' },
  healthy: { text: 'text-secondary', bg: 'bg-secondary/10', label: 'Healthy' },
}

export default function ProductSnapshotCard({ sku }) {
  if (sku === 'all') {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-400">
        <PackageSearch className="h-5 w-5 shrink-0 text-slate-300" />
        Showing aggregate data across all products. Pick a single product above for its stock health, category and reorder status.
      </div>
    )
  }

  const item = inventoryItems.find((i) => i.id === sku)
  if (!item) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-400 dark:border-white/10 dark:bg-slate-800/60">
        No inventory record found for {sku} yet.
      </div>
    )
  }

  const computed = withComputed(item, 3)
  const st = statusStyle[computed.status]

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
