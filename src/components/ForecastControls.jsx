import { skuOptions, modelOptions, horizonOptions as defaultHorizonOptions } from '../data/forecastData'

export default function ForecastControls({
  sku,
  onSku,
  modelId,
  onModel,
  horizon,
  onHorizon,
  availableHorizons = null,
  maxSafeHorizon = null,
}) {
  const dynamicOptions =
    availableHorizons && availableHorizons.length > 0
      ? availableHorizons.map((h) => ({
          value: h,
          label: `${h} days${h === maxSafeHorizon ? ' (Max Safe)' : ''}`,
        }))
      : defaultHorizonOptions

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs font-mono uppercase tracking-widest text-slate-400">Product</span>
          <select
            value={sku}
            onChange={(e) => onSku(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
          >
            {skuOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">Horizon</span>
            {maxSafeHorizon && (
              <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 font-mono">
                Cap: {maxSafeHorizon}d safe
              </span>
            )}
          </div>
          <select
            value={horizon || dynamicOptions[dynamicOptions.length - 1]?.value || 27}
            onChange={(e) => onHorizon(Number(e.target.value))}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
          >
            {dynamicOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400">Model</span>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">★ Auto-Selected: LSTM</span>
          </div>
          <div className="mt-1.5 flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-slate-900/60">
            {modelOptions.map((m) => (
              <button
                key={m.value}
                onClick={() => onModel(m.value)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                  modelId === m.value
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {m.label} {m.value === 'lstm' ? '★' : ''}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {modelOptions.find((m) => m.value === modelId)?.description}
      </p>
    </div>
  )
}
