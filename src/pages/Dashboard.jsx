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
import HourWeekdayHeatmap from '../components/HourWeekdayHeatmap'
import CategorySparklines from '../components/CategorySparklines'
import HierarchyLevelSwitcher from '../components/HierarchyLevelSwitcher'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useProducts } from '../hooks/useProducts'
import {
  Store,
  FlaskConical,
  Shield,
  ArrowRight,
  PackageSearch,
  BrainCircuit,
  Database,
  RefreshCw,
  AlertCircle,
  FolderSync,
} from 'lucide-react'

export default function Dashboard() {
  const [sku, setSku] = useState('all')
  const { user } = useAuth()
  const role = user?.role || 'retailer'

  const [stores, setStores] = useState([])
  const [selectedStore, setSelectedStore] = useState(() => {
    const assigned = user?.assigned_stores
    return assigned && assigned[0] && assigned[0] !== '*' ? assigned[0] : 'STORE_01'
  })

  const { products } = useProducts()
  const [insights, setInsights] = useState(null)
  const [forecastData, setForecastData] = useState(null)
  const [heatmapData, setHeatmapData] = useState([])
  const [categoryTrends, setCategoryTrends] = useState([])
  const [hierarchyLevel, setHierarchyLevel] = useState('category')
  const [hierarchyItems, setHierarchyItems] = useState([])
  const [hierarchyLoading, setHierarchyLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load authorized stores
  useEffect(() => {
    let active = true
    async function fetchStores() {
      try {
        const storeList = await api.getMyStores()
        if (active && Array.isArray(storeList) && storeList.length > 0) {
          setStores(storeList)
        }
      } catch (err) {
        if (active) {
          setStores([
            { store_id: 'STORE_01', store_name: 'FreshDirect - Flagship' },
            { store_id: 'STORE_02', store_name: 'FreshDirect - Midtown' },
            { store_id: 'STORE_03', store_name: 'FreshDirect - Suburbs' },
          ])
        }
      }
    }
    fetchStores()
    return () => {
      active = false
    }
  }, [])

  // Load verified insights and forecast from backend
  useEffect(() => {
    let active = true

    async function loadDashboardData() {
      try {
        setLoading(true)
        setError(null)
        const [insightsRes, fcRes, heatRes, catRes] = await Promise.allSettled([
          api.getDashboardInsights(selectedStore, sku),
          api.getForecast(selectedStore, sku),
          api.getDashboardHeatmap(selectedStore),
          api.getCategoryTrends(selectedStore),
        ])

        if (!active) return

        if (insightsRes.status === 'fulfilled') {
          setInsights(insightsRes.value)
        } else {
          setError(insightsRes.reason?.message || 'Could not fetch dashboard insights.')
        }

        if (fcRes.status === 'fulfilled') {
          setForecastData(fcRes.value)
        }
        if (heatRes.status === 'fulfilled' && heatRes.value?.cells) {
          setHeatmapData(heatRes.value.cells)
        }
        if (catRes.status === 'fulfilled' && catRes.value?.categories) {
          setCategoryTrends(catRes.value.categories)
        }
      } catch (err) {
        if (active) setError(err.message || 'Error communicating with backend.')
      } finally {
        if (active) setLoading(false)
      }
    }

    if (selectedStore) {
      loadDashboardData()
    }
    return () => {
      active = false
    }
  }, [selectedStore, sku])

  // Load Kimball star schema hierarchy aggregation
  useEffect(() => {
    let active = true
    async function loadHierarchy() {
      setHierarchyLoading(true)
      try {
        const res = await api.getHierarchy(selectedStore, hierarchyLevel)
        if (active && res && Array.isArray(res.items)) {
          setHierarchyItems(res.items)
        }
      } catch (err) {
        if (active) setHierarchyItems([])
      } finally {
        if (active) setHierarchyLoading(false)
      }
    }

    if (selectedStore) {
      loadHierarchy()
    }
    return () => {
      active = false
    }
  }, [selectedStore, hierarchyLevel])

  const productLabel = products.find((p) => p.value === sku)?.label ?? 'All Products'

  const salesTrendData = useMemo(() => {
    if (forecastData?.chartData) {
      return forecastData.chartData
        .filter((d) => d.actual != null)
        .map((d) => ({
          month: d.month,
          sales: d.actual,
          actual: d.actual,
          latent_demand: d.latent_demand,
          lost_sales: d.lost_sales,
          recovery_confidence: d.recovery_confidence,
        }))
    }
    return []
  }, [forecastData])

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
                {role === 'retailer' && 'Store & Inventory Management'}
                {role === 'ml_engineer' && 'Data Science & Model Benchmarks'}
                {role === 'admin' && 'Enterprise System Administration'}
              </span>
              <span className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Store {selectedStore}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {role === 'retailer' && 'Prioritizing stockout hazards, safety stock margins, and perishable reorder caps.'}
              {role === 'ml_engineer' && 'Tracking multi-model backtest errors (wMAPE, RMSE), R² fit, and tournament champions.'}
              {role === 'admin' && 'Managing dataset ingestion, system health, and cross-functional operational controls.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {role === 'admin' && (
            <Link
              to="/dw-mining"
              className="flex items-center gap-1.5 rounded-xl bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-600 transition hover:bg-sky-500/20 dark:text-sky-400"
            >
              <Database className="h-3.5 w-3.5" />
              DWM Cubes & Mining
            </Link>
          )}
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

      {/* Filter and Selection Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
        <div className="flex flex-wrap items-center gap-3">
          {/* Store Switcher */}
          {stores.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200">
              <Store className="h-3.5 w-3.5 text-slate-400" />
              <span>Store:</span>
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="bg-transparent font-semibold text-primary focus:outline-none cursor-pointer"
              >
                {stores.map((s) => (
                  <option key={s.store_id || s} value={s.store_id || s} className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">
                    {s.store_id || s} {s.store_name ? `· ${s.store_name}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <p className="text-sm text-slate-500 dark:text-slate-400">
            Viewing <span className="font-medium text-slate-700 dark:text-slate-200">{productLabel}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ProductSelector value={sku} onChange={setSku} products={products} />
        </div>
      </div>

      {loading ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 text-slate-500 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Calculating real warehouse KPIs & latent demand...</p>
          <p className="text-xs text-slate-400 mt-1">Evaluating tournament benchmarks and perishable shelf life...</p>
        </div>
      ) : !insights || !insights.has_data ? (
        /* Authentic Empty State — Never show hardcoded fake numbers */
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-16 text-center dark:border-white/10 dark:bg-slate-900/40">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mb-4">
            <FolderSync className="h-7 w-7" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            No Warehouse Data for {selectedStore}
          </h3>
          <p className="mt-2 max-w-md text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {insights?.message || 'The star schema facts for this store slice are not yet populated in the dimensional warehouse.'}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {role === 'admin' ? (
              <Link
                to="/dw-mining"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-primary/90 transition"
              >
                <Database className="h-4 w-4" />
                Build Warehouse & Run ETL
              </Link>
            ) : (
              <button
                onClick={() => setSelectedStore('STORE_01')}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-primary/90 transition"
              >
                Switch to STORE_01
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4">
            <ProductSnapshotCard sku={sku} />
          </div>

          {/* Authentic KPIs computed directly from API */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {insights.kpis.map((kpi) => (
              <KpiCard key={kpi.id || kpi.label} {...kpi} />
            ))}
          </div>

          {/* Charts */}
          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SalesTrendChart
              data={salesTrendData}
              subtitle={sku === 'all' ? `Observed daily demand · ${selectedStore}` : `Observed demand · ${sku}`}
            />
            <ForecastGraphChart
              data={forecastData?.chartData || []}
              subtitle={
                sku === 'all'
                  ? `Actual vs predicted · ${insights.champion_model?.name || 'Tournament Champion'}`
                  : `Actual vs predicted · ${sku} · ${insights.champion_model?.name || 'Tournament Champion'}`
              }
              bestModel={forecastData?.best_model || { name: insights.champion_model?.name, metrics: { wmape: insights.champion_model?.wmape } }}
              allModels={forecastData?.all_models || []}
            />
          </div>

          {/* Hour x Weekday Demand Heatmap & Category Sparklines */}
          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <HourWeekdayHeatmap data={heatmapData} />
            <CategorySparklines categories={categoryTrends} />
          </div>

          {/* Kimball Star Schema Hierarchy Aggregation & SKU Drilldown */}
          <div className="mt-6">
            <HierarchyLevelSwitcher
              level={hierarchyLevel}
              onLevelChange={setHierarchyLevel}
              items={hierarchyItems}
              loading={hierarchyLoading}
            />
          </div>

          {/* Dynamic 'What Changed' Insights & Upcoming Alerts */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RecentActivityPanel items={insights.what_changed || []} />
            <UpcomingAlertsPanel alerts={insights.upcoming_alerts || []} />
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
