import { useMemo, useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'
import KpiCard from '../components/KpiCard'
import SalesTrendChart from '../components/SalesTrendChart'
import ForecastGraphChart from '../components/ForecastGraphChart'
import RecentActivityPanel from '../components/RecentActivityPanel'
import UpcomingAlertsPanel from '../components/UpcomingAlertsPanel'
import ProductSelector from '../components/ProductSelector'
import ProductSnapshotCard from '../components/ProductSnapshotCard'
import { kpis } from '../data/dashboardData'
import { generateSalesTrend } from '../data/salesTrendData'
import { generateForecast } from '../data/forecastData'
import { products } from '../data/products'

export default function Dashboard() {
  const [sku, setSku] = useState('all')

  const salesTrend = useMemo(() => generateSalesTrend(sku), [sku])
  const forecast = useMemo(
    () => generateForecast({ sku, modelId: 'lstm', horizonDays: 90 }),
    [sku]
  )
  const productLabel = products.find((p) => p.value === sku)?.label ?? 'All Products'

  return (
    <DashboardLayout title="Dashboard">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Viewing <span className="font-medium text-slate-700 dark:text-slate-200">{productLabel}</span>
        </p>
        <ProductSelector value={sku} onChange={setSku} />
      </div>

      <div className="mt-4">
        <ProductSnapshotCard sku={sku} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SalesTrendChart data={salesTrend} subtitle={sku === 'all' ? 'Last 12 months' : `Last 12 months · ${sku}`} />
        <ForecastGraphChart
          data={forecast.chartData}
          subtitle={sku === 'all' ? 'Actual vs predicted · LSTM' : `Actual vs predicted · ${sku} · LSTM`}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentActivityPanel />
        <UpcomingAlertsPanel />
      </div>
    </DashboardLayout>
  )
}
