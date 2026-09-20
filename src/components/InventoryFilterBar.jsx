import { Search } from 'lucide-react'

const statusTabs = [
  { key: 'all', label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'low', label: 'Low Stock' },
  { key: 'healthy', label: 'Healthy' },
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
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
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

          <select
            value={category}
            onChange={(e) => onCategory(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-slate-900/60">
          {statusTabs.map((tab) => (
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
              <span className="ml-1 font-mono text-[10px] opacity-70">{counts[tab.key]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Safety stock buffer</p>
          <p className="text-xs text-slate-400">
            Extra days of cover to hold beyond each item's lead time. Higher buffer recommends larger reorders sooner.
          </p>
        </div>
        <div className="flex items-center gap-3 sm:w-64">
          <input
            type="range"
            min={0}
            max={10}
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
