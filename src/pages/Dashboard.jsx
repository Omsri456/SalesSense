import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { useAuth } from '../context/AuthContext'
import { Store, FlaskConical, Shield, ArrowRight, PackageSearch, BrainCircuit } from 'lucide-react'

export default function Dashboard() {
  const [sku, setSku] = useState('all')
  const { user } = useAuth()
  const role = user?.role || 'retailer'

  const salesTrend = useMemo(() => generateSalesTrend(sku), [sku])
  const forecast = useMemo(
    () => generateForecast({ sku, modelId: 'lstm', horizonDays: 90 }),
    [sku]
  )
  const productLabel = products.find((p) => p.value === sku)?.label ?? 'All Products'

  return (
    <DashboardLayout title="Dashboard">
      {/* Persona Context Banner */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white to-slate-50 p-4 shadow-sm dark:border-white/10 dark:from-slate-900 dark:to-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {role === 'retailer' && <Store className="h-5 w-5" />}
            {role === 'ml_engineer' && <FlaskConical className="h-5 w-5" />}
            {role === 'admin' && <Shield className="h-5 w-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {role === 'retailer' && 'Store & Inventory Management Persona'}
                {role === 'ml_engineer' && 'Data Science & ML Engineering Persona'}
                {role === 'admin' && 'Enterprise System Administrator Persona'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {role === 'retailer' && 'Prioritizing stockout hazards, safety stock margins, and daily reorder quantities.'}
              {role === 'ml_engineer' && 'Tracking multi-model backtest errors (wMAPE, RMSE), R² fit, and tournament champions.'}
              {role === 'admin' && 'Managing dataset ingestion, system health, and cross-functional operational controls.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {role === 'retailer' && (
            <Link
              to="/inventory"
              className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
            >
              <PackageSearch className="h-3.5 w-3.5" />
              Check ROP Alerts
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
          {role === 'ml_engineer' && (
            <Link
              to="/models"
              className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
            >
              <BrainCircuit className="h-3.5 w-3.5" />
              Model Diagnostics
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>

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
