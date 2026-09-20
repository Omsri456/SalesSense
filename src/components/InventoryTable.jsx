import { ArrowUp, ArrowDown, ArrowUpDown, CheckCircle2, ShoppingCart } from 'lucide-react'

const statusConfig = {
  critical: { label: 'Critical', dot: 'bg-red-500', text: 'text-red-500', bg: 'bg-red-500/10' },
  low: { label: 'Low Stock', dot: 'bg-accent', text: 'text-accent', bg: 'bg-accent/10' },
  healthy: { label: 'Healthy', dot: 'bg-secondary', text: 'text-secondary', bg: 'bg-secondary/10' },
}

const columns = [
  { key: 'name', label: 'Product', align: 'left' },
  { key: 'stock', label: 'Stock', align: 'right' },
  { key: 'daysToStockout', label: 'Days to Stockout', align: 'right' },
  { key: 'status', label: 'Status', align: 'left' },
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
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left dark:border-white/10">
              {columns.map((col) => (
                <th key={col.key} className={`px-5 py-3 ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
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
              <th className="px-5 py-3 text-right text-xs font-mono uppercase tracking-widest text-slate-400">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const cfg = statusConfig[item.status]
              const isReordered = reorderedIds.has(item.id)
              const daysLabel = Number.isFinite(item.daysToStockout) ? `${item.daysToStockout.toFixed(1)}d` : '—'
              const coverPct = Number.isFinite(item.daysToStockout)
                ? Math.min(100, (item.daysToStockout / (item.leadTimeDays + 10)) * 100)
                : 100

              return (
                <tr
                  key={item.id}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 dark:border-white/5 dark:hover:bg-white/5"
                >
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{item.name}</p>
                    <p className="font-mono text-xs text-slate-400">
                      {item.id} &middot; {item.category} &middot; {item.warehouse}
                    </p>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <p className="font-mono font-medium text-slate-700 dark:text-slate-200">{item.stock} units</p>
                    <div className="mt-1 ml-auto h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                      <div
                        className={`h-full rounded-full ${cfg.dot}`}
                        style={{ width: `${coverPct}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-slate-600 dark:text-slate-300">{daysLabel}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono font-medium text-slate-700 dark:text-slate-200">
                    {item.suggestedQty > 0 ? `+${item.suggestedQty}` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {item.suggestedQty === 0 ? (
                      <span className="text-xs text-slate-300 dark:text-slate-600">Not needed</span>
                    ) : isReordered ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1.5 text-xs font-medium text-secondary">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Placed
                      </span>
                    ) : (
                      <button
                        onClick={() => onReorder(item.id)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-white"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Reorder {item.suggestedQty}
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
