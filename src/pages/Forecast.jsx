import { useMemo, useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'
import ForecastControls from '../components/ForecastControls'
import ForecastStatCards from '../components/ForecastStatCards'
import ForecastChart from '../components/ForecastChart'
import ForecastTable from '../components/ForecastTable'
import { generateForecast, modelOptions } from '../data/forecastData'

export default function Forecast() {
  const [sku, setSku] = useState('all')
  const [modelId, setModelId] = useState('lstm')
  const [horizon, setHorizon] = useState(90)

  const result = useMemo(
    () => generateForecast({ sku, modelId, horizonDays: horizon }),
    [sku, modelId, horizon]
  )

  const modelLabel = modelOptions.find((m) => m.value === modelId)?.label ?? modelId

  return (
    <DashboardLayout title="Forecast Dashboard">
      <div className="space-y-6">
        <ForecastControls
          sku={sku}
          onSku={setSku}
          modelId={modelId}
          onModel={setModelId}
          horizon={horizon}
          onHorizon={setHorizon}
        />

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
