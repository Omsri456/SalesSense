import { FileBarChart, PackageSearch, LineChart, BrainCircuit, Sparkles, Store } from 'lucide-react'
import { reportTypes, dateRangeOptions, formatOptions } from '../data/reportsData'

const typeIcon = {
  'sales-summary': FileBarChart,
  'inventory-health': PackageSearch,
  'forecast-accuracy': LineChart,
  'model-comparison': BrainCircuit,
}

export default function ReportGenerator({
  selectedType,
  onSelectType,
  dateRange,
  onDateRange,
  selectedStore,
  onSelectedStore,
  stores = [],
  format,
  onFormat,
  onGenerate,
  isGenerating,
  userRole = 'retailer',
}) {
  const isRetailer = userRole === 'retailer'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Generate Verified Analytical Report</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Pulls authentic records directly from analytical and model tournament endpoints.
          </p>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {reportTypes.map((t) => {
          const Icon = typeIcon[t.id]
          const active = selectedType === t.id
          return (
            <button
              key={t.id}
              onClick={() => onSelectType(t.id)}
              className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                active
                  ? 'border-primary bg-primary/5 shadow-xs'
                  : 'border-slate-200 hover:border-primary/40 dark:border-white/10'
              }`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{t.name}</p>
                <p className="mt-0.5 text-xs text-slate-400">{t.description}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Filter Parameters */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Store Scope */}
        <label className="block">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400 flex items-center gap-1">
              <Store className="h-3 w-3" />
              Store Scope
            </span>
            {isRetailer && (
              <span className="text-[10px] text-amber-500 font-sans font-medium">Assigned Store</span>
            )}
          </div>
          <select
            value={selectedStore}
            onChange={(e) => onSelectedStore(e.target.value)}
            disabled={isRetailer && stores.length <= 1}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:disabled:bg-slate-800"
          >
            {!isRetailer && <option value="all">All Stores (Cross-Store Aggregate)</option>}
            {stores.map((s) => (
              <option key={s.store_id || s} value={s.store_id || s}>
                {s.store_id || s} {s.store_name ? `· ${s.store_name}` : ''}
              </option>
            ))}
          </select>
        </label>

        {/* Date Range */}
        <label className="block">
          <span className="text-xs font-mono uppercase tracking-widest text-slate-400">Date Range</span>
          <select
            value={dateRange}
            onChange={(e) => onDateRange(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
          >
            {dateRangeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {/* Output Format */}
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-slate-400">Format</span>
          <div className="mt-1.5 flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-slate-900/60">
            {formatOptions.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => onFormat(f)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                  format === f
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={onGenerate}
        disabled={isGenerating}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 shadow-sm"
      >
        <Sparkles className="h-4 w-4" />
        {isGenerating ? 'Querying Backend & Compiling Report...' : 'Generate Verified Report'}
      </button>
    </div>
  )
}
