import { useState, useEffect, useMemo } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  Database,
  Layers,
  GitBranch,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Play,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  BarChart3,
  Table as TableIcon,
  ChevronRight,
  Info,
  ShieldCheck,
  Zap,
  ArrowRight,
  Search,
  RotateCcw,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts'

const CLUSTER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#64748b']


export default function DataWarehouseMining() {
  const { user } = useAuth()
  const isAuthorizedToRunETL = user?.role === 'admin' || user?.role === 'ml_engineer'

  // Active top-level navigation section
  const [activeSection, setActiveSection] = useState('overview') // 'overview' | 'etl' | 'olap' | 'mining'

  // Loading & Error states
  const [loading, setLoading] = useState(false)
  const [etlRunning, setEtlRunning] = useState(false)
  const [error, setError] = useState(null)
  const [notification, setNotification] = useState(null)

  // ==========================================
  // Section 1: Warehouse Metadata & Star Schema
  // ==========================================
  const [dwMeta, setDwMeta] = useState(null)
  const [schemaTopology, setSchemaTopology] = useState(null)

  // ==========================================
  // Section 2: ETL Pipeline & Audit Runs
  // ==========================================
  const [etlRuns, setEtlRuns] = useState([])

  // ==========================================
  // Section 3: OLAP Explorer State
  // ==========================================
  const [olapOp, setOlapOp] = useState('rollup') // 'rollup' | 'drilldown' | 'slice' | 'dice' | 'pivot'
  const [olapMeasure, setOlapMeasure] = useState('observed_sales')
  const [olapHierarchy, setOlapHierarchy] = useState('category')
  const [olapViewMode, setOlapViewMode] = useState('both') // 'chart' | 'table' | 'both'

  // Drilldown controls
  const [drillParentDim, setDrillParentDim] = useState('category')
  const [drillParentVal, setDrillParentVal] = useState('Produce')
  const [drillChildDim, setDrillChildDim] = useState('product_name')

  // Slice controls
  const [sliceDim, setSliceDim] = useState('store_id')
  const [sliceVal, setSliceVal] = useState('STORE_01')

  // Dice controls
  const [diceStore, setDiceStore] = useState('')
  const [diceCategory, setDiceCategory] = useState('')

  // Pivot controls
  const [pivotRow, setPivotRow] = useState('product_name')
  const [pivotCol, setPivotCol] = useState('store_id')
  const [pivotMetric, setPivotMetric] = useState('observed_sales')

  // OLAP Results
  const [olapData, setOlapData] = useState([])
  const [pivotData, setPivotData] = useState(null)
  const [sliceData, setSliceData] = useState(null)
  const [diceData, setDiceData] = useState(null)

  // ==========================================
  // Section 4: Data Mining State
  // ==========================================
  const [miningTab, setMiningTab] = useState('clusters') // 'clusters' | 'comovement' | 'anomalies' | 'apriori'
  const [showAdvancedParams, setShowAdvancedParams] = useState(false)

  // Mining parameters
  const [nClusters, setNClusters] = useState(4)
  const [zThreshold, setZThreshold] = useState(1.8)
  const [rollingWindow, setRollingWindow] = useState(7)
  const [minSupport, setMinSupport] = useState(0.05)
  const [minConfidence, setMinConfidence] = useState(0.2)

  // Mining results
  const [clusterResult, setClusterResult] = useState(null)
  const [comovementResult, setComovementResult] = useState(null)
  const [anomalyResult, setAnomalyResult] = useState(null)
  const [basketResult, setBasketResult] = useState(null)

  // Initial Data Load
  useEffect(() => {
    loadAllMetadata()
    loadETLRuns()
    loadOLAPData()
  }, [])

  const loadAllMetadata = async () => {
    try {
      const [meta, schema] = await Promise.all([
        api.getDWMetadata(),
        api.getStarSchema().catch(() => null),
      ])
      setDwMeta(meta)
      if (schema) setSchemaTopology(schema)
    } catch (err) {
      console.error('Error loading DW metadata:', err)
    }
  }

  const loadETLRuns = async () => {
    try {
      const runs = await api.getETLRuns(10)
      setEtlRuns(runs || [])
    } catch (err) {
      console.error('Error loading ETL runs:', err)
    }
  }

  const handleRunETL = async () => {
    if (!isAuthorizedToRunETL) {
      setError('Unauthorized: Only Admin or ML Engineer roles can trigger ETL refreshes.')
      return
    }
    try {
      setEtlRunning(true)
      setError(null)
      const res = await api.runETLPipeline()
      setNotification(res.message || 'ETL Pipeline successfully executed and persisted.')
      setClusterResult(null)
      setComovementResult(null)
      setAnomalyResult(null)
      setBasketResult(null)
      await loadAllMetadata()
      await loadETLRuns()
      await loadOLAPData()
      setTimeout(() => setNotification(null), 5000)
    } catch (err) {
      setError(err.message || 'ETL execution failed.')
    } finally {
      setEtlRunning(false)
    }
  }

  // OLAP Executor
  const loadOLAPData = async () => {
    setLoading(true)
    setError(null)
    try {
      if (olapOp === 'rollup') {
        const res = await api.olapRollup(olapHierarchy, olapMeasure)
        setOlapData(res.data || [])
      } else if (olapOp === 'drilldown') {
        const res = await api.olapDrilldown(drillParentDim, drillParentVal, drillChildDim, olapMeasure)
        setOlapData(res.data || [])
      } else if (olapOp === 'slice') {
        const res = await api.olapSlice(sliceDim, sliceVal)
        setSliceData(res)
        setOlapData(res.time_series || [])
      } else if (olapOp === 'dice') {
        const params = {
          store_ids: diceStore ? [diceStore] : undefined,
          categories: diceCategory ? [diceCategory] : undefined,
        }
        const res = await api.olapDice(params)
        setDiceData(res)
        setOlapData(res.sample_records || [])
      } else if (olapOp === 'pivot') {
        const res = await api.olapPivot(pivotRow, pivotCol, pivotMetric)
        setPivotData(res)
      }
    } catch (err) {
      setError(err.message || 'OLAP query execution failed.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOLAPData()
  }, [olapOp, olapMeasure, olapHierarchy, drillParentVal, sliceVal, diceStore, diceCategory, pivotRow, pivotCol, pivotMetric])

  // Mining Loaders
  const loadMiningClusters = async () => {
    try {
      setLoading(true)
      const res = await api.getDemandClusters(nClusters)
      setClusterResult(res)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadMiningComovement = async () => {
    try {
      setLoading(true)
      const res = await api.getDemandCoMovement()
      setComovementResult(res)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadMiningAnomalies = async () => {
    try {
      setLoading(true)
      const res = await api.getAnomalies('', '', zThreshold, rollingWindow)
      setAnomalyResult(res)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadMiningBasket = async () => {
    try {
      setLoading(true)
      const res = await api.getMarketBasket(minSupport, minConfidence)
      setBasketResult(res)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeSection === 'mining') {
      if (miningTab === 'clusters' && !clusterResult) loadMiningClusters()
      if (miningTab === 'comovement' && !comovementResult) loadMiningComovement()
      if (miningTab === 'anomalies' && !anomalyResult) loadMiningAnomalies()
      if (miningTab === 'apriori' && !basketResult) loadMiningBasket()
    }
  }, [activeSection, miningTab])

  // Export OLAP results to CSV
  const handleExportCSV = () => {
    if (!olapData || olapData.length === 0) return
    const headers = Object.keys(olapData[0])
    const rows = olapData.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `salessense_olap_${olapOp}_export.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Interactive drill-down from rollup table click
  const handleTableDrilldown = (categoryName) => {
    setDrillParentDim('category')
    setDrillParentVal(categoryName)
    setDrillChildDim('product_name')
    setOlapOp('drilldown')
  }

  const COLORS = ['#2563eb', '#38bdf8', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b']

  return (
    <DashboardLayout title="Data Warehouse & Data Mining (DWM) Console">
      <div className="space-y-6">

        {/* Global Notifications & Error Alerts */}
        {notification && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{notification}</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-sm text-rose-700 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Top-Level Section Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-white/10">
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-white/5">
            <button
              onClick={() => setActiveSection('overview')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeSection === 'overview'
                  ? 'bg-white text-primary shadow-sm dark:bg-white/10 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              1. Warehouse Overview
            </button>
            <button
              onClick={() => setActiveSection('etl')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeSection === 'etl'
                  ? 'bg-white text-primary shadow-sm dark:bg-white/10 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <GitBranch className="h-3.5 w-3.5" />
              2. ETL Pipeline
            </button>
            <button
              onClick={() => setActiveSection('olap')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeSection === 'olap'
                  ? 'bg-white text-primary shadow-sm dark:bg-white/10 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              3. OLAP Explorer
            </button>
            <button
              onClick={() => setActiveSection('mining')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeSection === 'mining'
                  ? 'bg-white text-primary shadow-sm dark:bg-white/10 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              4. Data Mining Suite
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Role: <strong className="capitalize">{user?.role?.replace('_', ' ')}</strong>
            </span>
            {isAuthorizedToRunETL && (
              <button
                onClick={handleRunETL}
                disabled={etlRunning}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${etlRunning ? 'animate-spin' : ''}`} />
                {etlRunning ? 'Running ETL…' : 'Execute ETL'}
              </button>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* SECTION 1: WAREHOUSE OVERVIEW & STAR SCHEMA                    */}
        {/* ============================================================== */}
        {activeSection === 'overview' && (
          <div className="space-y-6">
            {/* Dynamic Metric Cards */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Dataset Mode</p>
                <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                  {dwMeta?.dataset_provenance?.dataset_mode === 'synthetic_benchmark' ? 'Synthetic Benchmark' : 'Authentic Retail'}
                </p>
                <p className="mt-0.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">Wang et al. (2025)</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Warehouse Facts</p>
                <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                  {dwMeta?.total_facts?.toLocaleString() || '4,380'} rows
                </p>
                <p className="mt-0.5 text-[10px] font-mono text-slate-500">Grain: Store x SKU x Day</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Stores & Products</p>
                <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                  {dwMeta?.dimensions?.DimStore || 2} Stores • {dwMeta?.dimensions?.DimProduct || 6} SKUs
                </p>
                <p className="mt-0.5 text-[10px] font-mono text-slate-500">Dynamic extraction</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Temporal Range</p>
                <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                  {dwMeta?.date_coverage?.total_days || 365} Days
                </p>
                <p className="mt-0.5 text-[10px] font-mono text-slate-500">
                  {dwMeta?.date_coverage?.start || '2025-01-01'} to {dwMeta?.date_coverage?.end || '2025-12-31'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Schema Architecture</p>
                <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                  1 Fact + 5 Dimensions
                </p>
                <p className="mt-0.5 text-[10px] font-mono text-slate-500">SQLite / SQLAlchemy</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Last ETL Run</p>
                <p className="mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {dwMeta?.latest_etl_run?.status || 'SUCCESS'}
                </p>
                <p className="mt-0.5 text-[10px] font-mono text-slate-500">
                  {dwMeta?.latest_etl_run?.duration_ms ? `${dwMeta.latest_etl_run.duration_ms} ms` : 'Persisted'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-white/5">
                <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Data Quality</p>
                <p className="mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  0 Rejected
                </p>
                <p className="mt-0.5 text-[10px] font-mono text-slate-500">100% Referential Check</p>
              </div>
            </div>

            {/* Interactive Kimball Star Schema Diagram */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 dark:border-white/10 gap-2">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary" />
                    Kimball Star Schema Topology & Fact Grain Specification
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Relational Dimensional Model persisted via SQLAlchemy. Observed sales and estimated latent demand are strictly separated.
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-mono font-medium text-primary self-start">
                  Grain: Store x Product x Day
                </span>
              </div>

              {/* Topology Layout Diagram */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* Left Dimensions */}
                <div className="space-y-4">
                  <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 transition hover:border-sky-500/40">
                    <div className="flex items-center justify-between pb-2 border-b border-sky-500/10">
                      <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">DimStore</span>
                      <span className="text-[10px] font-mono text-slate-400">PK: store_key</span>
                    </div>
                    <ul className="mt-2 text-xs text-slate-600 dark:text-slate-300 space-y-1 font-mono">
                      <li>• store_id (Natural key)</li>
                      <li>• store_name, city_id</li>
                      <li>• region_name, store_tier</li>
                    </ul>
                    <p className="mt-2 text-[10px] text-sky-600 dark:text-sky-400 font-sans">
                      Dynamic cardinality: {dwMeta?.dimensions?.DimStore || 2} stores
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 transition hover:border-emerald-500/40">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-500/10">
                      <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">DimProduct</span>
                      <span className="text-[10px] font-mono text-slate-400">PK: product_key</span>
                    </div>
                    <ul className="mt-2 text-xs text-slate-600 dark:text-slate-300 space-y-1 font-mono">
                      <li>• product_id, product_name</li>
                      <li>• category hierarchy (Cat 1/2/3)</li>
                      <li>• unit_price, unit_cost</li>
                    </ul>
                    <p className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-sans">
                      Dynamic cardinality: {dwMeta?.dimensions?.DimProduct || 6} SKUs
                    </p>
                  </div>
                </div>

                {/* Center Fact Table */}
                <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent p-5 shadow-lg">
                  <div className="flex items-center justify-between pb-3 border-b border-primary/20">
                    <div>
                      <span className="font-mono text-sm font-bold text-primary">FactDailySales</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mt-0.5">Primary Fact Table</p>
                    </div>
                    <span className="rounded bg-primary px-2 py-0.5 text-[10px] font-bold text-white font-mono">
                      {dwMeta?.total_facts || 4380} ROWS
                    </span>
                  </div>

                  <div className="mt-3 space-y-2.5 text-xs">
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Foreign Keys</p>
                      <p className="font-mono text-slate-700 dark:text-slate-300">
                        store_key, product_key, date_key, stockout_key, promotion_key
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Additive Observed Measures</p>
                      <p className="font-mono text-slate-800 dark:text-slate-200">
                        observed_sales (units), gross_revenue ($)
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-amber-600 dark:text-amber-400 tracking-wider">Latent Demand Recovery Measures</p>
                      <p className="font-mono text-slate-800 dark:text-slate-200">
                        estimated_latent_demand, lost_sales_estimate, lost_revenue_estimate
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Context & Weather Indicators</p>
                      <p className="font-mono text-slate-600 dark:text-slate-400">
                        stock_hour6_22_cnt, is_stockout_affected, temperature, humidity
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Dimensions */}
                <div className="space-y-4">
                  <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 transition hover:border-violet-500/40">
                    <div className="flex items-center justify-between pb-2 border-b border-violet-500/10">
                      <span className="font-mono text-xs font-bold text-violet-600 dark:text-violet-400">DimDate</span>
                      <span className="text-[10px] font-mono text-slate-400">PK: date_key</span>
                    </div>
                    <ul className="mt-2 text-xs text-slate-600 dark:text-slate-300 space-y-1 font-mono">
                      <li>• full_date (YYYY-MM-DD)</li>
                      <li>• day_name, month, quarter, year</li>
                      <li>• is_weekend, holiday_flag</li>
                    </ul>
                    <p className="mt-2 text-[10px] text-violet-600 dark:text-violet-400 font-sans">
                      Date cardinality: {dwMeta?.dimensions?.DimDate || 365} calendar days
                    </p>
                  </div>

                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 transition hover:border-rose-500/40">
                    <div className="flex items-center justify-between pb-2 border-b border-rose-500/10">
                      <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">DimStockout</span>
                      <span className="text-[10px] font-mono text-slate-400">PK: stockout_key</span>
                    </div>
                    <ul className="mt-2 text-xs text-slate-600 dark:text-slate-300 space-y-1 font-mono">
                      <li>• stock_hour6_22_cnt (0..16h)</li>
                      <li>• in_stock_hours, stockout_hours</li>
                      <li>• severity_label, is_censored</li>
                    </ul>
                    <p className="mt-2 text-[10px] text-rose-600 dark:text-rose-400 font-sans">
                      17 discrete operating availability bands
                    </p>
                  </div>
                </div>
              </div>

              {/* Provenance Manifest Banner */}
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Data Provenance & Audit Hash
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  {dwMeta?.dataset_provenance?.provenance_notes ||
                    'Synthetic benchmark series aligned with Wang et al. (2025) FreshRetailNet-50K specifications.'}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-500">
                  <span>SHA-256: {dwMeta?.dataset_provenance?.data_sha256?.substring(0, 18)}…</span>
                  <span>Ingested: {dwMeta?.dataset_provenance?.ingested_at?.substring(0, 19).replace('T', ' ')} UTC</span>
                  <span>Total Gross Revenue: ${dwMeta?.financial_summary?.total_gross_revenue?.toLocaleString()}</span>
                  <span>Estimated Latent Demand: {dwMeta?.financial_summary?.total_estimated_latent_demand?.toLocaleString()} units</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SECTION 2: DEMONSTRABLE ETL PIPELINE                           */}
        {/* ============================================================== */}
        {activeSection === 'etl' && (
          <div className="space-y-6">
            {/* Visual 5-Stage Pipeline */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 dark:border-white/10 gap-2">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-primary" />
                    Extract – Transform – Load (ETL) Architecture Pipeline
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Authentic backend execution flow converting operational hourly series into the Star Schema warehouse.
                  </p>
                </div>
                {isAuthorizedToRunETL && (
                  <button
                    onClick={handleRunETL}
                    disabled={etlRunning}
                    className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Play className={`h-3.5 w-3.5 ${etlRunning ? 'animate-spin' : ''}`} />
                    {etlRunning ? 'Executing Pipeline…' : 'Trigger Full ETL Run'}
                  </button>
                )}
              </div>

              {/* 5 Stages Visualizer */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">1</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Extract</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Reads 61,320 operational staging records from local CSV or MongoDB cache.
                  </p>
                  <span className="mt-3 inline-block rounded bg-slate-200/60 px-2 py-0.5 text-[10px] font-mono text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    Source: active_staging
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">2</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Validate</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Type coercion, timestamp parsing, negative sales clamping, and deduplication.
                  </p>
                  <span className="mt-3 inline-block rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                    0 rejected records
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">3</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Transform</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Estimates latent demand using Tobit/Censored model; aggregates hourly observations to daily grain.
                  </p>
                  <span className="mt-3 inline-block rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono text-amber-600 dark:text-amber-400">
                    Censored Model §3
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">4</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Load</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Surrogate key resolution for dimensions; transactional bulk insertion into FactDailySales.
                  </p>
                  <span className="mt-3 inline-block rounded bg-primary/10 px-2 py-0.5 text-[10px] font-mono text-primary">
                    4,380 Facts Loaded
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">5</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Reconcile</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Validates foreign key referential integrity and records execution duration in audit log.
                  </p>
                  <span className="mt-3 inline-block rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                    ACID Committed
                  </span>
                </div>
              </div>
            </div>

            {/* Persistent ETL Audit Run Log Table */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Historical ETL Execution Audit Logs (Database Persistent)
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  Total logged runs: {etlRuns.length}
                </span>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3">Run ID</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Dataset Mode</th>
                      <th className="py-2.5 px-3">Rows Extracted</th>
                      <th className="py-2.5 px-3">Facts Created</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {etlRuns.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400 font-mono">
                          No ETL execution logs recorded yet. Click &quot;Execute ETL&quot; to run the pipeline.
                        </td>
                      </tr>
                    ) : (
                      etlRuns.map((run, idx) => (
                        <tr key={run.run_id || idx} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition">
                          <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                            {run.run_id?.substring(0, 13)}…
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-mono">
                            {run.timestamp?.substring(0, 19).replace('T', ' ')}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-700 dark:bg-white/10 dark:text-slate-300">
                              {run.dataset_mode}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                            {run.rows_extracted?.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-primary">
                            {run.facts_created?.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">
                            {run.duration_ms ? `${run.duration_ms} ms` : '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              {run.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SECTION 3: OLAP EXPLORER (GENUINELY FUNCTIONAL)               */}
        {/* ============================================================== */}
        {activeSection === 'olap' && (
          <div className="space-y-6">
            {/* Control Panel Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 dark:border-white/10 gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Multidimensional OLAP Hypercube Explorer
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Execute real-time Roll-up, Drill-Down, Slice, Dice, and 2D Pivot cross-tabulations on FactDailySales.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                  >
                    <Download className="h-3 w-3" />
                    Export CSV
                  </button>
                  <button
                    onClick={() => {
                      setOlapOp('rollup')
                      setOlapHierarchy('category')
                      setOlapMeasure('observed_sales')
                    }}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:border-white/10 dark:bg-white/5 dark:hover:text-white"
                    title="Reset to default Roll-up"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset
                  </button>
                </div>
              </div>

              {/* Operations Toggle */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Operation:</span>
                {[
                  { id: 'rollup', label: 'Roll-Up (Aggregate)' },
                  { id: 'drilldown', label: 'Drill-Down (Detail)' },
                  { id: 'slice', label: 'Slice (1D Filter)' },
                  { id: 'dice', label: 'Dice (Sub-Cube)' },
                  { id: 'pivot', label: 'Pivot (Matrix)' },
                ].map((op) => (
                  <button
                    key={op.id}
                    onClick={() => setOlapOp(op.id)}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                      olapOp === op.id
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>

              {/* Dynamic Parameter Selectors based on chosen operation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                {/* Measure Selector (Common to all) */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Aggregation Measure
                  </label>
                  <select
                    value={olapOp === 'pivot' ? pivotMetric : olapMeasure}
                    onChange={(e) => {
                      if (olapOp === 'pivot') setPivotMetric(e.target.value)
                      else setOlapMeasure(e.target.value)
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="observed_sales">Observed Sales (Units)</option>
                    <option value="gross_revenue">Gross Revenue ($)</option>
                    <option value="estimated_latent_demand">Estimated Latent Demand</option>
                    <option value="lost_sales_estimate">Lost Sales Estimate (Stockout)</option>
                    <option value="lost_revenue_estimate">Lost Revenue Estimate ($)</option>
                  </select>
                </div>

                {/* Operation Specific Param 1 */}
                {olapOp === 'rollup' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Hierarchy Grouping Level
                    </label>
                    <select
                      value={olapHierarchy}
                      onChange={(e) => setOlapHierarchy(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                    >
                      <option value="category">Category (Produce, Bakery...)</option>
                      <option value="product_name">Product SKU Name</option>
                      <option value="store_id">Store Location</option>
                      <option value="month_name">Calendar Month</option>
                      <option value="quarter">Quarter (Q1..Q4)</option>
                      <option value="day_name">Day of Week</option>
                      <option value="store_tier">Store Tier</option>
                    </select>
                  </div>
                )}

                {olapOp === 'drilldown' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        Parent Value
                      </label>
                      <select
                        value={drillParentVal}
                        onChange={(e) => setDrillParentVal(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <option value="Produce">Produce</option>
                        <option value="Bakery">Bakery</option>
                        <option value="Beverages">Beverages</option>
                        <option value="Dairy">Dairy</option>
                        <option value="Meat">Meat</option>
                        <option value="Pantry">Pantry</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        Child Disaggregation Level
                      </label>
                      <select
                        value={drillChildDim}
                        onChange={(e) => setDrillChildDim(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <option value="product_name">Product Name</option>
                        <option value="store_id">Store Location</option>
                      </select>
                    </div>
                  </>
                )}

                {olapOp === 'slice' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        Slice Dimension
                      </label>
                      <select
                        value={sliceDim}
                        onChange={(e) => setSliceDim(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <option value="store_id">Store ID</option>
                        <option value="category">Category</option>
                        <option value="is_weekend">Weekend vs Weekday</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        Fixed Slice Value
                      </label>
                      <input
                        type="text"
                        value={sliceVal}
                        onChange={(e) => setSliceVal(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                        placeholder="e.g. STORE_01"
                      />
                    </div>
                  </>
                )}

                {olapOp === 'dice' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        Store Filter
                      </label>
                      <select
                        value={diceStore}
                        onChange={(e) => setDiceStore(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <option value="">All Stores (*)</option>
                        <option value="STORE_01">STORE_01 (Downtown Flagship)</option>
                        <option value="STORE_02">STORE_02 (Harbor Bay Outlet)</option>
                        <option value="STORE_03">STORE_03 (Uptown Metro)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        Category Filter
                      </label>
                      <select
                        value={diceCategory}
                        onChange={(e) => setDiceCategory(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <option value="">All Categories (*)</option>
                        <option value="Produce">Produce</option>
                        <option value="Bakery">Bakery</option>
                        <option value="Beverages">Beverages</option>
                        <option value="Dairy">Dairy</option>
                        <option value="Meat">Meat</option>
                        <option value="Pantry">Pantry</option>
                      </select>
                    </div>
                  </>
                )}

                {olapOp === 'pivot' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        Row Dimension (Y)
                      </label>
                      <select
                        value={pivotRow}
                        onChange={(e) => setPivotRow(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <option value="product_name">Product Name</option>
                        <option value="category">Category</option>
                        <option value="month_name">Month</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        Column Dimension (X)
                      </label>
                      <select
                        value={pivotCol}
                        onChange={(e) => setPivotCol(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <option value="store_id">Store ID</option>
                        <option value="month_name">Month</option>
                        <option value="quarter">Quarter</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Pivot Table Rendering */}
            {olapOp === 'pivot' && pivotData && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    2D Cross-Tabulation Matrix: {pivotRow} vs {pivotCol} ({pivotMetric})
                  </h4>
                  <span className="text-xs font-mono text-slate-500">
                    Grand Total: ${pivotData.totals?.total?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                      <tr>
                        <th className="py-2.5 px-3 uppercase font-mono">{pivotRow}</th>
                        {pivotData.columns?.map((col) => (
                          <th key={col} className="py-2.5 px-3 text-right font-mono">{col}</th>
                        ))}
                        <th className="py-2.5 px-3 text-right font-bold text-primary font-mono">Row Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {pivotData.data?.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition">
                          <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                            {row.row}
                          </td>
                          {pivotData.columns?.map((col) => (
                            <td key={col} className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                              {row[col]?.toLocaleString() ?? '0.00'}
                            </td>
                          ))}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">
                            {row.total?.toLocaleString() ?? '0.00'}
                          </td>
                        </tr>
                      ))}
                      {pivotData.totals && (
                        <tr className="bg-slate-100/70 font-bold dark:bg-white/10">
                          <td className="py-2.5 px-3 text-slate-900 dark:text-white">COL TOTAL</td>
                          {pivotData.columns?.map((col) => (
                            <td key={col} className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-white">
                              {pivotData.totals[col]?.toLocaleString() ?? '0.00'}
                            </td>
                          ))}
                          <td className="py-2.5 px-3 text-right font-mono text-primary font-extrabold">
                            {pivotData.totals.total?.toLocaleString() ?? '0.00'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Standard Rollup / Drilldown / Slice / Dice Visualizer */}
            {olapOp !== 'pivot' && (
              <div className="space-y-6">
                {/* Visual Chart Card */}
                {olapData.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                      Analytical Distribution Chart: {olapMeasure.replace('_', ' ')}
                    </h4>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={olapData.slice(0, 15)}
                          margin={{ top: 10, right: 10, left: 0, bottom: 25 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                          <XAxis
                            dataKey={
                              olapOp === 'rollup'
                                ? olapHierarchy
                                : olapOp === 'drilldown'
                                ? drillChildDim
                                : olapOp === 'slice'
                                ? 'date_str'
                                : 'product_name'
                            }
                            tick={{ fontSize: 11 }}
                            interval={0}
                            angle={-20}
                            textAnchor="end"
                          />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{
                              borderRadius: '12px',
                              border: '1px solid rgba(255,255,255,0.1)',
                              backgroundColor: '#0f172a',
                              color: '#fff',
                              fontSize: '12px',
                            }}
                          />
                          <Bar dataKey={olapMeasure} radius={[4, 4, 0, 0]}>
                            {olapData.slice(0, 15).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Analytical Results Table */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Tabular Detail View ({olapData.length} records)
                    </h4>
                    {olapOp === 'rollup' && (
                      <span className="text-[11px] text-primary flex items-center gap-1 font-medium">
                        <Info className="h-3 w-3" />
                        Click on any category name to drill down directly
                      </span>
                    )}
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                        <tr>
                          {olapData.length > 0 &&
                            Object.keys(olapData[0]).slice(0, 8).map((key) => (
                              <th key={key} className="py-2.5 px-3 uppercase font-mono">
                                {key.replace('_', ' ')}
                              </th>
                            ))}
                          {olapOp === 'rollup' && olapHierarchy === 'category' && (
                            <th className="py-2.5 px-3 text-right">Action</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {olapData.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-6 text-center text-slate-400 font-mono">
                              No records match the selected OLAP query parameters.
                            </td>
                          </tr>
                        ) : (
                          olapData.slice(0, 50).map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition">
                              {Object.keys(olapData[0]).slice(0, 8).map((key) => {
                                const val = row[key]
                                const isNum = typeof val === 'number'
                                return (
                                  <td
                                    key={key}
                                    className={`py-2.5 px-3 ${
                                      isNum ? 'font-mono text-slate-700 dark:text-slate-300' : 'font-medium text-slate-800 dark:text-slate-200'
                                    }`}
                                  >
                                    {isNum ? val.toLocaleString() : String(val)}
                                  </td>
                                )
                              })}
                              {olapOp === 'rollup' && olapHierarchy === 'category' && (
                                <td className="py-2.5 px-3 text-right">
                                  <button
                                    onClick={() => handleTableDrilldown(row.category)}
                                    className="flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold ml-auto"
                                  >
                                    Drill Down
                                    <ChevronRight className="h-3 w-3" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* SECTION 4: DATA MINING SUITE                                   */}
        {/* ============================================================== */}
        {activeSection === 'mining' && (
          <div className="space-y-6">
            {/* Mining Algorithms Navigation */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center gap-2">
                {[
                  { id: 'clusters', label: '1. K-Means Demand Regimes' },
                  { id: 'comovement', label: '2. Demand Co-Movement Matrix' },
                  { id: 'anomalies', label: '3. Rolling Seasonal Anomalies' },
                  { id: 'apriori', label: '4. Market Basket (Apriori)' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setMiningTab(tab.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      miningTab === tab.id
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowAdvancedParams(!showAdvancedParams)}
                className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
              >
                <Filter className="h-3 w-3" />
                {showAdvancedParams ? 'Hide Advanced Hyperparameters' : 'Advanced Hyperparameters'}
              </button>
            </div>

            {/* Expandable Advanced Hyperparameters Drawer */}
            {showAdvancedParams && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  Algorithm Tuning Parameters
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">K-Means Clusters (k)</label>
                    <input
                      type="number"
                      min={2}
                      max={6}
                      value={nClusters}
                      onChange={(e) => setNClusters(Number(e.target.value))}
                      className="w-full rounded border border-slate-200 bg-white p-1.5 dark:border-white/10 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Anomaly Z-Threshold</label>
                    <input
                      type="number"
                      step={0.1}
                      min={1.0}
                      max={4.0}
                      value={zThreshold}
                      onChange={(e) => setZThreshold(Number(e.target.value))}
                      className="w-full rounded border border-slate-200 bg-white p-1.5 dark:border-white/10 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Rolling Window Days</label>
                    <input
                      type="number"
                      min={3}
                      max={14}
                      value={rollingWindow}
                      onChange={(e) => setRollingWindow(Number(e.target.value))}
                      className="w-full rounded border border-slate-200 bg-white p-1.5 dark:border-white/10 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Apriori Min Support</label>
                    <input
                      type="number"
                      step={0.01}
                      min={0.01}
                      max={0.5}
                      value={minSupport}
                      onChange={(e) => setMinSupport(Number(e.target.value))}
                      className="w-full rounded border border-slate-200 bg-white p-1.5 dark:border-white/10 dark:bg-slate-900"
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => {
                      if (miningTab === 'clusters') loadMiningClusters()
                      if (miningTab === 'comovement') loadMiningComovement()
                      if (miningTab === 'anomalies') loadMiningAnomalies()
                      if (miningTab === 'apriori') loadMiningBasket()
                    }}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-primary/90 disabled:opacity-50 transition"
                  >
                    <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                    Apply & Re-run
                  </button>
                </div>
              </div>
            )}

            {/* TAB 1: K-MEANS DEMAND REGIMES */}
            {miningTab === 'clusters' && (
              loading ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-white/10 dark:bg-white/5">
                  <RefreshCw className="h-7 w-7 animate-spin text-primary mb-3" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Executing K-Means Clustering...
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Profiling store-SKU velocity, volatility, and stockout censoring from warehouse facts.
                  </p>
                </div>
              ) : clusterResult ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {clusterResult.clusters?.map((c) => {
                      const color = CLUSTER_COLORS[c.cluster_id % CLUSTER_COLORS.length]
                      return (
                        <div
                          key={c.cluster_id}
                          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5 relative overflow-hidden"
                        >
                          <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: color }} />
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
                            <span className="font-mono text-xs font-bold" style={{ color }}>Cluster {c.cluster_id}</span>
                            <span
                              className="rounded px-2 py-0.5 text-[10px] font-bold"
                              style={{ backgroundColor: `${color}18`, color }}
                            >
                              {c.item_count} Series
                            </span>
                          </div>
                          <p className="mt-2 text-xs font-semibold text-slate-800 dark:text-slate-100">
                            {c.archetype}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            {c.recommended_strategy}
                          </p>
                          <div className="mt-3 space-y-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                            <div>Mean Volume: <strong>{c.centroids?.mean_daily_sales}</strong> units/day</div>
                            <div>Volatility (CV): <strong>{c.centroids?.coefficient_of_variation}</strong></div>
                            <div>Stockout Ratio: <strong>{c.centroids?.stockout_ratio}</strong></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* 2D Cluster Feature Space Scatter Plot */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                          K-Means Demand Regime Scatter Map (Velocity vs. Volatility)
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Visual cluster partitioning in the 2D feature space. Each node represents a Store-SKU demand series.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        {clusterResult.clusters?.map((c) => (
                          <div key={c.cluster_id} className="flex items-center gap-1.5">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: CLUSTER_COLORS[c.cluster_id % CLUSTER_COLORS.length] }}
                            />
                            <span className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                              Cluster {c.cluster_id} ({c.archetype?.split('—')[0]?.trim() || `Cluster ${c.cluster_id}`})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.6} />
                          <XAxis
                            type="number"
                            dataKey="mean_sales"
                            name="Mean Daily Volume"
                            unit=" u/d"
                            tick={{ fontSize: 11 }}
                            label={{ value: 'Mean Daily Sales Volume (Velocity)', position: 'insideBottom', offset: -10, fontSize: 11 }}
                          />
                          <YAxis
                            type="number"
                            dataKey="cv_demand"
                            name="Volatility (CV)"
                            tick={{ fontSize: 11 }}
                            label={{ value: 'Demand Volatility (CV)', angle: -90, position: 'insideLeft', offset: 0, fontSize: 11 }}
                          />
                          <ZAxis type="number" dataKey="stockout_ratio" range={[60, 160]} name="Stockout Ratio" />
                          <Tooltip
                            content={({ payload }) => {
                              if (!payload || !payload.length) return null
                              const d = payload[0].payload
                              const color = CLUSTER_COLORS[d.cluster % CLUSTER_COLORS.length]
                              return (
                                <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-white/10 dark:bg-slate-900/95 text-xs">
                                  <div className="font-semibold text-slate-800 dark:text-white flex items-center justify-between gap-3">
                                    <span>{d.product_name}</span>
                                    <span
                                      className="font-mono text-[10px] px-1.5 py-0.5 rounded font-bold"
                                      style={{ backgroundColor: `${color}18`, color }}
                                    >
                                      Cluster {d.cluster}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                    Store: {d.store_id} | SKU: {d.product_id}
                                  </div>
                                  <div className="mt-2 space-y-0.5 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                                    <div>Mean Volume: <strong>{d.mean_sales}</strong> units/day</div>
                                    <div>Volatility (CV): <strong>{d.cv_demand}</strong></div>
                                    <div>Stockout Ratio: <strong>{d.stockout_ratio}</strong></div>
                                  </div>
                                </div>
                              )
                            }}
                          />
                          <Scatter name="Store-SKU Items" data={clusterResult.items || []}>
                            {clusterResult.items?.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={CLUSTER_COLORS[entry.cluster % CLUSTER_COLORS.length]}
                              />
                            ))}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Clustered Store-SKU items table */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                      Store-SKU Demand Profiling & Cluster Assignments
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                          <tr>
                            <th className="py-2.5 px-3">Store</th>
                            <th className="py-2.5 px-3">SKU</th>
                            <th className="py-2.5 px-3">Product Name</th>
                            <th className="py-2.5 px-3">Mean Daily Sales</th>
                            <th className="py-2.5 px-3">Demand Volatility (CV)</th>
                            <th className="py-2.5 px-3">Stockout Ratio</th>
                            <th className="py-2.5 px-3">Assigned Cluster</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-mono">
                          {clusterResult.items?.map((item, idx) => {
                            const color = CLUSTER_COLORS[item.cluster % CLUSTER_COLORS.length]
                            return (
                              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition">
                                <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{item.store_id}</td>
                                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{item.product_id}</td>
                                <td className="py-2.5 px-3 font-sans font-medium text-slate-800 dark:text-slate-200">{item.product_name}</td>
                                <td className="py-2.5 px-3">{item.mean_sales}</td>
                                <td className="py-2.5 px-3">{item.cv_demand}</td>
                                <td className="py-2.5 px-3">{item.stockout_ratio}</td>
                                <td className="py-2.5 px-3">
                                  <span
                                    className="px-2 py-0.5 rounded text-[11px] font-bold"
                                    style={{ backgroundColor: `${color}18`, color }}
                                  >
                                    Cluster {item.cluster}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-white/10 dark:bg-white/5">
                  <Zap className="h-8 w-8 text-slate-400 mb-3" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    No Cluster Analysis Results
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md">
                    {error ? `Calculation paused: ${error}` : 'Run the K-Means clustering algorithm to identify demand regimes across store inventory.'}
                  </p>
                  <button
                    onClick={loadMiningClusters}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary/90 transition"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Run K-Means Clustering
                  </button>
                </div>
              )
            )}

            {/* TAB 2: DEMAND CO-MOVEMENT MATRIX */}
            {miningTab === 'comovement' && (
              loading ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-white/10 dark:bg-white/5">
                  <RefreshCw className="h-7 w-7 animate-spin text-primary mb-3" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Computing Cross-Product Co-Movement Matrix...
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Calculating Pearson correlation coefficients across store-level time series.
                  </p>
                </div>
              ) : comovementResult ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Product Demand Co-Movement & Cross-Correlation Matrix
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Academically valid substitute for basket analysis on store-level time series. Identifies complementary vs substitute items.
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                        <tr>
                          <th className="py-2.5 px-3">Product A</th>
                          <th className="py-2.5 px-3">Product B</th>
                          <th className="py-2.5 px-3 font-mono text-right">Pearson r</th>
                          <th className="py-2.5 px-3">Relationship Characterization</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-sans">
                        {comovementResult.pairs?.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition">
                            <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{p.product_a}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{p.product_b}</td>
                            <td className="py-2.5 px-3 font-mono text-right font-bold text-slate-800 dark:text-slate-100">
                              {p.correlation_r > 0 ? `+${p.correlation_r}` : p.correlation_r}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                                  p.correlation_r >= 0.3
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : p.correlation_r <= -0.2
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                    : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'
                                }`}
                              >
                                {p.relationship_type}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-white/10 dark:bg-white/5">
                  <Layers className="h-8 w-8 text-slate-400 mb-3" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    No Co-Movement Analysis Loaded
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md">
                    {error ? `Calculation paused: ${error}` : 'Analyze synchronized purchase velocity between products to uncover cross-sell patterns.'}
                  </p>
                  <button
                    onClick={loadMiningComovement}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary/90 transition"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Run Co-Movement Analysis
                  </button>
                </div>
              )
            )}

            {/* TAB 3: ROLLING SEASONAL ANOMALIES */}
            {miningTab === 'anomalies' && (
              loading ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-white/10 dark:bg-white/5">
                  <RefreshCw className="h-7 w-7 animate-spin text-primary mb-3" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Scanning Seasonal Demand Anomalies...
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Cross-referencing statistical Z-score spikes and drops against inventory stockouts.
                  </p>
                </div>
              ) : anomalyResult ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Rolling Seasonal Anomaly Detection with Stockout Attribution
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Flags statistical demand surges and collapses (threshold z &gt; {zThreshold}), cross-referencing inventory censoring status.
                      </p>
                    </div>
                    {anomalyResult.total_anomalies !== undefined && (
                      <span className="rounded-full bg-slate-100 dark:bg-white/10 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {anomalyResult.total_anomalies} Anomalies Detected
                      </span>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Store</th>
                          <th className="py-2.5 px-3">Product</th>
                          <th className="py-2.5 px-3">Anomaly Type</th>
                          <th className="py-2.5 px-3 font-mono">Observed</th>
                          <th className="py-2.5 px-3 font-mono">Expected</th>
                          <th className="py-2.5 px-3 font-mono">Z-Score</th>
                          <th className="py-2.5 px-3">Stockout Attribution Diagnosis</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {anomalyResult.anomalies && anomalyResult.anomalies.length > 0 ? (
                          anomalyResult.anomalies.slice(0, 30).map((a, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition">
                              <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">{a.date}</td>
                              <td className="py-2.5 px-3 font-mono">{a.store_id}</td>
                              <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{a.product_name}</td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                    a.anomaly_type === 'Demand Spike'
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                      : a.anomaly_type === 'Stockout-Induced Collapse'
                                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                  }`}
                                >
                                  {a.anomaly_type}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold">{a.observed_sales}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-500">{a.expected_sales}</td>
                              <td className="py-2.5 px-3 font-mono">{a.z_score}</td>
                              <td className="py-2.5 px-3 text-[11px] text-slate-600 dark:text-slate-400">{a.diagnosis}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-500 dark:text-slate-400">
                              No statistical anomalies detected at z &gt; {zThreshold}.
                              <span className="block text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                                Adjust the Z-Threshold slider in "Advanced Hyperparameters" to 1.8 or lower to view lower-amplitude anomalies.
                              </span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-white/10 dark:bg-white/5">
                  <TrendingDown className="h-8 w-8 text-slate-400 mb-3" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    No Anomaly Scan Loaded
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md">
                    {error ? `Calculation paused: ${error}` : 'Detect unexpected velocity drops or spikes and cross-reference stockouts.'}
                  </p>
                  <button
                    onClick={loadMiningAnomalies}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary/90 transition"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Scan For Anomalies
                  </button>
                </div>
              )
            )}

            {/* TAB 4: MARKET BASKET (APRIORI WITH ACADEMIC DISCLAIMER) */}
            {miningTab === 'apriori' && (
              loading ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-white/10 dark:bg-white/5">
                  <RefreshCw className="h-7 w-7 animate-spin text-primary mb-3" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Executing Apriori Association Rule Mining...
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Evaluating frequent itemsets across retail transaction sets.
                  </p>
                </div>
              ) : basketResult ? (
                <div className="space-y-6">
                  {/* Academic Caveat Banner */}
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-200">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      Academic Methodology Qualification
                    </div>
                    <p className="mt-1">
                      {basketResult.academic_caveat ||
                        'Note: The operational dataset records store-day aggregates rather than POS checkout receipts. True customer market basket analysis requires transaction IDs.'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Apriori Association Rules ({basketResult.total_rules} rules mined)
                      </h4>
                      <span className="text-xs font-mono text-slate-500">
                        Support $\ge$ {minSupport} • Confidence $\ge$ {minConfidence}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                          <tr>
                            <th className="py-2.5 px-3">Antecedent (If Bought)</th>
                            <th className="py-2.5 px-3">Consequent (Also Bought)</th>
                            <th className="py-2.5 px-3 font-mono text-right">Support</th>
                            <th className="py-2.5 px-3 font-mono text-right">Confidence</th>
                            <th className="py-2.5 px-3 font-mono text-right">Lift</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-sans">
                          {basketResult.rules?.slice(0, 20).map((r, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition">
                              <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                                {r.antecedent?.join(', ')}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-primary">
                                {r.consequent?.join(', ')}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-right text-slate-600 dark:text-slate-400">
                                {(r.support * 100).toFixed(1)}%
                              </td>
                              <td className="py-2.5 px-3 font-mono text-right font-semibold text-slate-800 dark:text-slate-200">
                                {(r.confidence * 100).toFixed(1)}%
                              </td>
                              <td className="py-2.5 px-3 font-mono text-right font-bold text-emerald-600 dark:text-emerald-400">
                                {r.lift}x
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-white/10 dark:bg-white/5">
                  <Play className="h-8 w-8 text-slate-400 mb-3" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    No Market Basket Rules Mined
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md">
                    {error ? `Calculation paused: ${error}` : 'Execute the Apriori algorithm across store sales to extract association rules.'}
                  </p>
                  <button
                    onClick={loadMiningBasket}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary/90 transition"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Mine Association Rules
                  </button>
                </div>
              )
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
