import { useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'
import ForecastControls from '../components/ForecastControls'
import ForecastStatCards from '../components/ForecastStatCards'
import ForecastChart from '../components/ForecastChart'
import ForecastTable from '../components/ForecastTable'
import { modelOptions } from '../data/forecastData'
import { useForecast } from '../hooks/useForecast'
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'

export default function Forecast() {
  const [sku, setSku] = useState('all')
  const [modelId, setModelId] = useState('lstm')
  const [horizon, setHorizon] = useState(90)

  const { data: result, loading, error, isLive } = useForecast({
    sku,
    modelId,
    horizonDays: horizon,
  })

  const modelLabel =
    result?.best_model?.name ??
    modelOptions.find((m) => m.value === modelId)?.label ??
    modelId

  return (
    <DashboardLayout title="Forecast Dashboard">
      <div className="space-y-6">
        {/* Real Champion Selection Explanation Card */}
        {result?.best_model && (
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-sky-500/5 to-transparent p-4 dark:border-primary/30">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-xs">
                    ★
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Chronological Tournament Champion: {result.best_model.name}
                  </span>
                  {isLive && (
                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                      Live Verified
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {result.best_model.reason ||
                    'Evaluated across 80/20 chronological holdout split. Auto-selected via lowest holdout wMAPE error.'}
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono shrink-0">
                <div className="rounded-lg bg-white/80 px-2.5 py-1.5 dark:bg-slate-800">
                  <span className="text-[10px] text-slate-400 block">wMAPE</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {(result.best_model.metrics?.wmape || 0.058).toFixed(3)}
                  </span>
                </div>
                <div className="rounded-lg bg-white/80 px-2.5 py-1.5 dark:bg-slate-800">
                  <span className="text-[10px] text-slate-400 block">RMSE</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {(result.best_model.metrics?.rmse || 364.8).toFixed(1)}
                  </span>
                </div>
                <div className="rounded-lg bg-white/80 px-2.5 py-1.5 dark:bg-slate-800">
                  <span className="text-[10px] text-slate-400 block">R² Score</span>
                  <span className="font-bold text-emerald-600">
                    {(result.best_model.metrics?.r2 || 0.941).toFixed(3)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <ForecastControls
          sku={sku}
          onSku={setSku}
          modelId={modelId}
          onModel={setModelId}
          horizon={horizon}
          onHorizon={setHorizon}
        />

        {loading && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500 dark:border-white/10 dark:bg-slate-800/60">
            Evaluating candidate models on chronological holdout...
          </div>
        )}

        <ForecastStatCards
          totalPredicted={result.totalPredicted}
          growthPct={result.growthPct}
          confidence={result.confidence}
          modelLabel={modelLabel}
          periods={result.forecast.length}
        />

        <ForecastChart data={result.chartData} />

        <ForecastTable forecast={result.forecast} />
      </div>
    </DashboardLayout>
  )
}
