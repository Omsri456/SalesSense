import { seededRandom } from '../lib/random'
import { products as skuOptions, productScale } from './products'

export { skuOptions }


export const modelOptions = [
  { value: 'lstm', label: 'LSTM', description: 'Deep learning sequence model, strong on complex seasonal patterns.', growthFactor: 1.15, bandFactor: 1.3 },
  { value: 'sarima', label: 'SARIMA', description: 'Statistical model, smooth and stable on regular seasonality.', growthFactor: 0.9, bandFactor: 0.8 },
  { value: 'prophet', label: 'Prophet', description: "Additive model, robust to holidays and missing data.", growthFactor: 1.0, bandFactor: 1.0 },
]

export const horizonOptions = [
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 180, label: '6 months' },
]

const historyMonths = [
  { month: 'Jul', sales: 48200 },
  { month: 'Aug', sales: 46700 },
  { month: 'Sep', sales: 51300 },
  { month: 'Oct', sales: 55600 },
  { month: 'Nov', sales: 60200 },
  { month: 'Dec', sales: 64100 },
]

const futureMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']

export function generateForecast({ sku, modelId, horizonDays }) {
  const model = modelOptions.find((m) => m.value === modelId) ?? modelOptions[0]
  const rand = seededRandom(sku, modelId, horizonDays)

  // A small per-SKU multiplier so "All Products" reads bigger than a single SKU.
  const skuScale = productScale(sku)
  const history = historyMonths.map((h) => ({
    month: h.month,
    sales: Math.round(h.sales * skuScale),
  }))

  const periodsCount = Math.max(1, Math.min(8, Math.round(horizonDays / 30)))
  const baseline = history[history.length - 1].sales
  const baseGrowth = (0.025 + rand() * 0.05) * model.growthFactor

  const forecast = []
  let prevValue = baseline
  for (let i = 0; i < periodsCount; i++) {
    const noise = (rand() - 0.5) * 0.04
    const value = Math.round(prevValue * (1 + baseGrowth + noise))
    const bandWidth = (0.03 + i * 0.015) * model.bandFactor
    forecast.push({
      month: futureMonthNames[i % futureMonthNames.length],
      predicted: value,
      low: Math.round(value * (1 - bandWidth)),
      high: Math.round(value * (1 + bandWidth)),
    })
    prevValue = value
  }

  // Merge into one series for the chart: history has `actual`, forecast has
  // `predicted`; the last historical point carries both so the lines connect.
  const chartData = history.map((h, i) => ({
    month: h.month,
    actual: h.sales,
    predicted: i === history.length - 1 ? h.sales : null,
  }))
  forecast.forEach((f) =>
    chartData.push({
      month: f.month,
      actual: null,
      predicted: f.predicted,
      low: f.low,
      bandWidth: f.high - f.low,
    })
  )

  const totalPredicted = forecast.reduce((sum, f) => sum + f.predicted, 0)
  const growthPct = ((forecast[forecast.length - 1].predicted - baseline) / baseline) * 100
  const confidence = Math.max(80, Math.min(98, Math.round(94 - periodsCount * 0.8 + rand() * 4)))

  return { history, forecast, chartData, totalPredicted, growthPct, confidence, model }
}
