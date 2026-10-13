import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DashboardLayout from '../layouts/DashboardLayout'
import KpiCard from '../components/KpiCard'
import SalesTrendChart from '../components/SalesTrendChart'
import ForecastGraphChart from '../components/ForecastGraphChart'
import RecentActivityPanel from '../components/RecentActivityPanel'
import UpcomingAlertsPanel from '../components/UpcomingAlertsPanel'
import ProductSelector from '../components/ProductSelector'
import ProductSnapshotCard from '../components/ProductSnapshotCard'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useProducts } from '../hooks/useProducts'
import { generateSalesTrend } from '../data/salesTrendData'
import { generateForecast } from '../data/forecastData'
import {
  Store,
  FlaskConical,
  Shield,
  ArrowRight,
  PackageSearch,
  BrainCircuit,
  Database,
} from 'lucide-react'

export default function Dashboard() {
  const [sku, setSku] = useState('all')
  const { user } = useAuth()
  const role = user?.role || 'retailer'
  const assignedStore = user?.assigned_stores?.[0] || 'STORE_01'

  const { products } = useProducts()
  const [dwMeta, setDwMeta] = useState(null)
  const [forecastData, setForecastData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isLive, setIsLive] = useState(false)

  // Fetch warehouse metadata & forecast
  useEffect(() => {
    let active = true

    async function loadDashboardData() {
      try {
        setLoading(true)
        const [metaRes, fcRes] = await Promise.allSettled([
          api.getDWMetadata(),
          api.getForecast(assignedStore, sku, 90),
        ])

        if (!active) return

        if (metaRes.status === 'fulfilled') {
          setDwMeta(metaRes.value)
        }
        if (fcRes.status === 'fulfilled') {
          setForecastData(fcRes.value)
          setIsLive(true)
        }
      } catch (err) {
        console.error('Dashboard data load error:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadDashboardData()
    return () => {
      active = false
    }
  }, [sku, assignedStore])

  // Fallbacks if backend is booting
  const fallbackSalesTrend = useMemo(() => generateSalesTrend(sku), [sku])
  const fallbackForecast = useMemo(
    () => generateForecast({ sku, modelId: 'lstm', horizonDays: 90 }),
    [sku]
  )

  const activeForecast = forecastData || fallbackForecast
  const productLabel = products.find((p) => p.value === sku)?.label ?? 'All Products'

  // Dynamic KPI Cards computed from live warehouse & forecast
  const dynamicKpis = useMemo(() => {
    const grossRev = dwMeta?.financial_summary?.total_gross_revenue || 428900
    const lostRev = dwMeta?.financial_summary?.total_lost_revenue_estimate || 24800
    const champModel = activeForecast?.best_model?.name || 'LSTM Network'
    const accuracy = activeForecast?.best_model?.metrics?.accuracy || activeForecast?.confidence || 93.4

    return [
      {
        label: 'Gross Warehouse Revenue',
        value: `$${Math.round(grossRev).toLocaleString()}`,
        change: '+8.4% vs last period',
        trend: 'up',
        color: 'text-primary',
        subtext: `${dwMeta?.financial_summary?.total_units_sold?.toLocaleString() || '18,420'} units observed`,
      },
      {
        label: 'Stockout Lost Revenue',
        value: `$${Math.round(lostRev).toLocaleString()}`,
        change: 'Unconstrained Latent Demand',
        trend: 'down',
        color: 'text-rose-600',
        subtext: 'FreshRetailNet-50K Censoring Recovery',
      },
      {
        label: 'Forecast Champion Fit',
        value: `${champModel}`,
        change: `${accuracy.toFixed(1)}% Accuracy (Holdout)`,
        trend: 'up',
        color: 'text-emerald-600',
        subtext: `Holdout wMAPE: ${(activeForecast?.best_model?.metrics?.wmape || 0.058).toFixed(3)}`,
      },
      {
        label: 'Inventory Safety Posture',
        value: 'Optimal (ROP Active)',
        change: 'Dynamic Lead-Time Buffer',
        trend: 'up',
        color: 'text-amber-600',
        subtext: `${dwMeta?.dimensions?.DimProduct || 6} SKUs tracked in store`,
      },
    ]
  }, [dwMeta, activeForecast])

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
              <span className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Store Scope: {assignedStore === '*' ? 'Global' : assignedStore}
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
          <Link
            to="/dw-mining"
            className="flex items-center gap-1.5 rounded-xl bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-600 transition hover:bg-sky-500/20 dark:text-sky-400"
          >
            <Database className="h-3.5 w-3.5" />
            DWM Cubes & Mining
          </Link>
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
          {isLive && <span className="ml-2 text-xs font-mono text-emerald-600 font-semibold">• Live Backend Connected</span>}
        </p>
        <ProductSelector value={sku} onChange={setSku} />
      </div>

      <div className="mt-4">
        <ProductSnapshotCard sku={sku} />
      </div>

      {/* Dynamic KPIs */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dynamicKpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SalesTrendChart
          data={activeForecast.chartData?.slice(0, 6)?.map(d => ({ month: d.month, actual: d.actual })) || fallbackSalesTrend}
          subtitle={sku === 'all' ? 'Historical demand observations' : `Historical demand · ${sku}`}
        />
        <ForecastGraphChart
          data={activeForecast.chartData || fallbackForecast.chartData}
          subtitle={
            sku === 'all'
              ? `Actual vs predicted · ${activeForecast.best_model?.name || 'Champion Model'}`
              : `Actual vs predicted · ${sku} · ${activeForecast.best_model?.name || 'Champion Model'}`
          }
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentActivityPanel />
        <UpcomingAlertsPanel />
      </div>
    </DashboardLayout>
  )
}
