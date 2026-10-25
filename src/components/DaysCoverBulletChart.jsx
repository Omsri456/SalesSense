import { chartColors } from '../lib/chartTheme'

export default function DaysCoverBulletChart({
  coverDays = 4.2,
  leadTimeDays = 2,
  shelfLifeDays = 5,
  isPerishable = true,
  width = 'w-48',
}) {
  const maxDisplayHorizon = isPerishable
    ? Math.max(shelfLifeDays * 1.3, leadTimeDays + 6)
    : Math.max(coverDays * 1.2, leadTimeDays + 14)

  const coverPct = Math.min(100, Math.max(2, (coverDays / maxDisplayHorizon) * 100))
  const leadTimePct = Math.min(95, Math.max(5, (leadTimeDays / maxDisplayHorizon) * 100))
  const shelfLifePct = isPerishable ? Math.min(100, (shelfLifeDays / maxDisplayHorizon) * 100) : 100

  // Bar color based on threshold logic
  let barColor = chartColors.healthy
  if (coverDays > shelfLifeDays) {
    barColor = chartColors.expiryRisk // Spoilage danger
  } else if (coverDays <= leadTimeDays) {
    barColor = chartColors.criticalStock // Stockout hazard
  } else if (coverDays <= leadTimeDays + 2) {
    barColor = chartColors.lowStock // Buffer thin
  }

  return (
    <div className={`space-y-1 ${width}`}>
      <div className="flex items-center justify-between text-xs font-mono">
        <span
          className={`font-semibold ${
            coverDays > shelfLifeDays
              ? 'text-rose-500'
              : coverDays <= leadTimeDays
              ? 'text-red-500'
              : 'text-slate-700 dark:text-slate-200'
          }`}
        >
          {Number.isFinite(coverDays) ? `${coverDays.toFixed(1)}d cover` : '—'}
        </span>
        <span className="text-[10px] text-slate-400">
          LT: {leadTimeDays}d · SL: {shelfLifeDays}d
        </span>
      </div>

      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        {/* Cover Bar */}
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${coverPct}%`, backgroundColor: barColor }}
        />

        {/* Lead Time Threshold Tick */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-slate-800/60 dark:bg-white/60"
          style={{ left: `${leadTimePct}%` }}
          title={`Lead time: ${leadTimeDays} days`}
        />

        {/* Shelf Life Expiry Hazard Tick */}
        {isPerishable && (
          <div
            className="absolute top-0 bottom-0 w-1 bg-rose-500"
            style={{ left: `${shelfLifePct}%` }}
            title={`Perishable shelf-life expiry: ${shelfLifeDays} days`}
          />
        )}
      </div>
    </div>
  )
}
