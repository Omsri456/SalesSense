import { Search, Store } from 'lucide-react'

const statusTabs = [
  { key: 'all', label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'low', label: 'Low Stock' },
  { key: 'healthy', label: 'Healthy' },
  { key: 'expiry_risk', label: 'Expiry Risk' },
]

export default function InventoryFilterBar({
  search,
  onSearch,
  status,
  onStatus,
  category,
  onCategory,
  categories,
  counts,
  safetyDays,
  onSafetyDays,
  perishablesOnly = false,
  onPerishablesOnly,
  stores = [],
  selectedStore,
  onStoreChange,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Store Selector */}
          {stores.length > 0 && onStoreChange && (
            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-white/10 dark:bg-slate-900">
              <Store className="h-4 w-4 text-slate-400" />
              <select
                value={selectedStore}
                onChange={(e) => onStoreChange(e.target.value)}
                className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none dark:text-slate-200 cursor-pointer"
              >
                {stores.map((s) => (
                  <option key={s.store_id || s} value={s.store_id || s}>
                    {s.store_name ? `${s.store_id} - ${s.store_name}` : s.store_id || s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search Box */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search SKU or product name..."
              className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary focus:outline-none dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
            />
          </div>

          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => onCategory(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Perishables Only Checkbox */}
          {onPerishablesOnly && (
            <label className="flex items-center gap-2 cursor-pointer select-none rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-900">
              <input
                type="checkbox"
                checked={perishablesOnly}
                onChange={(e) => onPerishablesOnly(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary accent-primary focus:ring-primary dark:border-slate-600"
              />
              <span>Perishables only (&le;7d shelf life)</span>
            </label>
          )}
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-slate-900/60">
          {statusTabs.map((tab) => {
            const count = counts[tab.key] ?? (tab.key === 'expiry_risk' ? (counts.expiry_risk ?? counts.expiryRisk ?? 0) : 0)
            return (
              <button
                key={tab.key}
                onClick={() => onStatus(tab.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  status === tab.key
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {tab.label}
                <span className="ml-1 font-mono text-[10px] opacity-70">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Safety stock buffer</p>
          <p className="text-xs text-slate-400">
            Extra days of cover to hold beyond lead time. Perishables are automatically capped to avoid spoilage.
          </p>
        </div>
        <div className="flex items-center gap-3 sm:w-64">
          <input
            type="range"
            min={1}
            max={14}
            step={1}
            value={safetyDays}
            onChange={(e) => onSafetyDays(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-primary dark:bg-slate-700"
          />
          <span className="w-16 shrink-0 rounded-full bg-primary/10 px-2 py-1 text-center text-xs font-mono font-semibold text-primary">
            {safetyDays}d
          </span>
        </div>
      </div>
    </div>
  )
}
