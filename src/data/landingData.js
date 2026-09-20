import {
  BrainCircuit,
  PackageSearch,
  LineChart,
  Scale,
  LayoutDashboard,
  FileBarChart,
} from 'lucide-react'

export const features = [
  {
    icon: BrainCircuit,
    title: 'AI Forecasting',
    description:
      'Blend LSTM, Prophet and SARIMA to project demand weeks or months ahead, tuned per product line.',
  },
  {
    icon: PackageSearch,
    title: 'Inventory Recommendation',
    description:
      'Turn forecasts into reorder points and safety stock, so shelves stay full without tying up cash.',
  },
  {
    icon: LineChart,
    title: 'Product Forecasting',
    description:
      'Drill into any SKU to see its own demand curve, seasonality, and confidence band.',
  },
  {
    icon: Scale,
    title: 'Model Comparison',
    description:
      'Score every model on RMSE, WMAPE and R² side by side, and let SalesSense flag the best fit.',
  },
  {
    icon: LayoutDashboard,
    title: 'Interactive Dashboard',
    description:
      'One view for sales trend, forecast accuracy, and inventory health, updated as data lands.',
  },
  {
    icon: FileBarChart,
    title: 'Smart Reports',
    description:
      'Export board-ready PDF, CSV or Excel reports with the charts and numbers already assembled.',
  },
]

export const workflowSteps = [
  { label: 'Upload dataset', detail: 'Bring historical sales as CSV, no formatting gymnastics.' },
  { label: 'Train models', detail: 'LSTM, Prophet and SARIMA train in parallel on your data.' },
  { label: 'Generate forecast', detail: 'A horizon-ready forecast with confidence bands appears.' },
  { label: 'Inventory recommendation', detail: 'Reorder quantities and safety stock are calculated.' },
  { label: 'Business insights', detail: 'Trends, risks and opportunities surface automatically.' },
]

export const stats = [
  { value: '95%', label: 'Forecast accuracy' },
  { value: '3', label: 'AI models compared' },
  { value: '500+', label: 'Forecasts generated' },
]

// Dummy series for the hero forecast chart (illustrative, not real data)
export const heroSeries = {
  actual: [40, 44, 42, 48, 52, 50, 58, 60, 64, 62],
  predicted: [null, null, null, null, null, null, null, 62, 68, 74, 80, 86],
}
