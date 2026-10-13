import { useState, useEffect } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  Layers,
  GitBranch,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Database,
  Network,
} from 'lucide-react'

export default function DataWarehouseMining() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('olap') // 'olap' | 'mining_basket' | 'mining_clusters' | 'mining_anomalies'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // DW Metadata
  const [dwMeta, setDwMeta] = useState(null)

  // OLAP State
  const [rollupLevel, setRollupLevel] = useState('category')
  const [rollupMetric, setRollupMetric] = useState('observed_sales')
  const [rollupData, setRollupData] = useState([])
  const [pivotRow, setPivotRow] = useState('product_name')
  const [pivotCol, setPivotCol] = useState('store_id')
  const [pivotMetric, setPivotMetric] = useState('observed_sales')
  const [pivotData, setPivotData] = useState(null)

  // Mining: Market Basket
  const [minSupport, setMinSupport] = useState(0.02)
  const [minConfidence, setMinConfidence] = useState(0.15)
  const [basketResult, setBasketResult] = useState(null)

  // Mining: Clusters
  const [nClusters, setNClusters] = useState(4)
  const [clusterResult, setClusterResult] = useState(null)

  // Mining: Anomalies
  const [zThreshold, setZThreshold] = useState(2.2)
  const [anomalyResult, setAnomalyResult] = useState(null)

  useEffect(() => {
    loadDWMetadata()
    loadRollup()
    loadPivot()
  }, [])

  const loadDWMetadata = async () => {
    try {
      const data = await api.getDWMetadata()
      setDwMeta(data)
    } catch (err) {
      console.error(err)
    }
  }

  const loadRollup = async () => {
    try {
      setLoading(true)
      const res = await api.olapRollup(rollupLevel, rollupMetric)
      setRollupData(res.data || [])
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadPivot = async () => {
    try {
      const res = await api.olapPivot(pivotRow, pivotCol, pivotMetric)
      setPivotData(res)
    } catch (err) {
      console.error(err)
    }
  }

  const handleRebuildWarehouse = async () => {
    try {
      setLoading(true)
      await api.rebuildWarehouse()
      await loadDWMetadata()
      await loadRollup()
      await loadPivot()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadMarketBasket = async () => {
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

  const loadClusters = async () => {
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

  const loadAnomalies = async () => {
    try {
      setLoading(true)
      const res = await api.getAnomalies('', '', zThreshold, 7)
      setAnomalyResult(res)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'mining_basket' && !basketResult) loadMarketBasket()
    if (activeTab === 'mining_clusters' && !clusterResult) loadClusters()
    if (activeTab === 'mining_anomalies' && !anomalyResult) loadAnomalies()
  }, [activeTab])

  return (
    <DashboardLayout title="Data Warehouse & Data Mining Intelligence">
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-sky-500/5 to-transparent p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
                  <Database className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Kimball Dimensional Architecture & Knowledge Discovery
                </span>
              </div>
              <h1 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                Retail OLAP Cubes & Machine Mining Suite
              </h1>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 max-w-3xl">
                Operates directly on Kimball Star Schema facts (<span className="font-mono text-primary">FactDailySales</span>). Supports multi-dimensional slicing, dicing, rollups, and cross-tabulation pivots alongside unsupervised pattern extraction (Apriori Market Basket, K-Means Demand Archetypes, and Residual Anomaly Tracking).
              </p>
            </div>

            {['admin', 'ml_engineer'].includes(user?.role) && (
              <button
                onClick={handleRebuildWarehouse}
                disabled={loading}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Rebuild Dimensional Warehouse
              </button>
            )}
          </div>

          {/* Quick Metrics from Warehouse */}
          {dwMeta && (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-slate-200/60 pt-4 dark:border-white/10">
              <div className="rounded-xl bg-white/70 p-3 shadow-xs dark:bg-slate-800/60">
                <p className="text-[10px] font-mono uppercase text-slate-500">Fact Table Records</p>
                <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">{dwMeta.total_facts.toLocaleString()}</p>
                <p className="text-[10px] text-emerald-600 font-medium">FactDailySales</p>
              </div>
              <div className="rounded-xl bg-white/70 p-3 shadow-xs dark:bg-slate-800/60">
                <p className="text-[10px] font-mono uppercase text-slate-500">Gross Sales Revenue</p>
                <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">
                  ${Math.round(dwMeta.financial_summary?.total_gross_revenue || 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-500">{Math.round(dwMeta.financial_summary?.total_units_sold || 0).toLocaleString()} units sold</p>
              </div>
              <div className="rounded-xl bg-white/70 p-3 shadow-xs dark:bg-slate-800/60">
                <p className="text-[10px] font-mono uppercase text-slate-500">Stockout Lost Revenue</p>
                <p className="mt-0.5 text-base font-bold text-rose-600 dark:text-rose-400">
                  ${Math.round(dwMeta.financial_summary?.total_lost_revenue_estimate || 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-rose-500 font-medium">Latent Demand Recovery</p>
              </div>
              <div className="rounded-xl bg-white/70 p-3 shadow-xs dark:bg-slate-800/60">
                <p className="text-[10px] font-mono uppercase text-slate-500">Active Star Dimensions</p>
                <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">
                  {Object.keys(dwMeta.dimensions || {}).length} Dimensions
                </p>
                <p className="text-[10px] text-slate-500">{dwMeta.date_coverage?.total_days || 0} calendar days</p>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-white/10 gap-2">
          <button
            onClick={() => setActiveTab('olap')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'olap'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Layers className="h-4 w-4" />
            OLAP Rollup & Pivot Matrix
          </button>
          <button
            onClick={() => setActiveTab('mining_basket')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'mining_basket'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <GitBranch className="h-4 w-4" />
            Market Basket (Apriori Rules)
          </button>
          <button
            onClick={() => setActiveTab('mining_clusters')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'mining_clusters'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Network className="h-4 w-4" />
            Demand Regime Clusters (K-Means)
          </button>
          <button
            onClick={() => setActiveTab('mining_anomalies')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'mining_anomalies'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            Stockout & Demand Anomalies
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* TAB 1: OLAP ROLLUP & PIVOT */}
        {activeTab === 'olap' && (
          <div className="space-y-6">
            {/* Rollup Controls & Table */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Multidimensional Rollup Aggregation</h2>
                  <p className="text-xs text-slate-500">Roll up transactional facts to category, store, or calendar grain.</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={rollupLevel}
                    onChange={(e) => setRollupLevel(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium dark:border-white/10 dark:bg-slate-700 text-slate-800 dark:text-white"
                  >
                    <option value="category">Hierarchy: Product Category</option>
                    <option value="management_group_id">Hierarchy: Management Group (Research Factor)</option>
                    <option value="month_name">Hierarchy: Calendar Month</option>
                    <option value="store_id">Hierarchy: Retail Store</option>
                  </select>
                  <select
                    value={rollupMetric}
                    onChange={(e) => setRollupMetric(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium dark:border-white/10 dark:bg-slate-700 text-slate-800 dark:text-white"
                  >
                    <option value="observed_sales">Metric: Observed Sales Units</option>
                    <option value="gross_revenue">Metric: Gross Revenue ($)</option>
                    <option value="estimated_latent_demand">Metric: Latent Unconstrained Demand</option>
                    <option value="lost_revenue_estimate">Metric: Lost Stockout Revenue ($)</option>
                  </select>
                  <button
                    onClick={loadRollup}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover"
                  >
                    Execute Rollup
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3 uppercase font-semibold">Hierarchy Member</th>
                      <th className="py-2.5 px-3 uppercase font-semibold text-right">Fact Count</th>
                      <th className="py-2.5 px-3 uppercase font-semibold text-right">Observed Units</th>
                      <th className="py-2.5 px-3 uppercase font-semibold text-right">Gross Revenue</th>
                      <th className="py-2.5 px-3 uppercase font-semibold text-right">Latent Demand</th>
                      <th className="py-2.5 px-3 uppercase font-semibold text-right text-rose-600">Stockout Lost Rev</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {rollupData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {String(row[rollupLevel] ?? '—')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">{row.record_count?.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900 dark:text-white">
                          {Math.round(row.observed_sales || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-white">
                          ${Math.round(row.gross_revenue || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-primary font-medium">
                          {Math.round(row.estimated_latent_demand || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-medium">
                          ${Math.round(row.lost_revenue_estimate || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2D Cross-tabulation Pivot Matrix */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">2D Cross-Tabulation Pivot Matrix</h2>
                  <p className="text-xs text-slate-500">Rotates dimensional cubes into an interactive spreadsheet matrix.</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={pivotRow}
                    onChange={(e) => setPivotRow(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium dark:border-white/10 dark:bg-slate-700 text-slate-800 dark:text-white"
                  >
                    <option value="product_name">Rows: Product SKU</option>
                    <option value="category">Rows: Category</option>
                  </select>
                  <span className="text-xs text-slate-400">×</span>
                  <select
                    value={pivotCol}
                    onChange={(e) => setPivotCol(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium dark:border-white/10 dark:bg-slate-700 text-slate-800 dark:text-white"
                  >
                    <option value="store_id">Columns: Store</option>
                    <option value="month_name">Columns: Month</option>
                  </select>
                  <select
                    value={pivotMetric}
                    onChange={(e) => setPivotMetric(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium dark:border-white/10 dark:bg-slate-700 text-slate-800 dark:text-white"
                  >
                    <option value="observed_sales">Values: Units Sold</option>
                    <option value="gross_revenue">Values: Gross Revenue ($)</option>
                    <option value="lost_revenue_estimate">Values: Lost Revenue ($)</option>
                  </select>
                  <button
                    onClick={loadPivot}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover"
                  >
                    Render Pivot
                  </button>
                </div>
              </div>

              {pivotData && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
                      <tr>
                        <th className="py-2.5 px-3 uppercase font-semibold">{pivotData.row_dim}</th>
                        {pivotData.columns.map((c) => (
                          <th key={c} className="py-2.5 px-3 uppercase font-semibold text-right">{c}</th>
                        ))}
                        <th className="py-2.5 px-3 uppercase font-bold text-right bg-slate-100/70 dark:bg-slate-600/40">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {pivotData.data.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                          <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{r.row}</td>
                          {pivotData.columns.map((c) => (
                            <td key={c} className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                              {pivotMetric.includes('revenue') ? `$${Math.round(r[c] || 0).toLocaleString()}` : Math.round(r[c] || 0).toLocaleString()}
                            </td>
                          ))}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-primary bg-slate-50/60 dark:bg-slate-700/30">
                            {pivotMetric.includes('revenue') ? `$${Math.round(r.total || 0).toLocaleString()}` : Math.round(r.total || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {/* Column Grand Totals */}
                      {pivotData.totals && (
                        <tr className="bg-slate-100 font-bold dark:bg-slate-700/60">
                          <td className="py-2.5 px-3 text-slate-900 dark:text-white uppercase">{pivotData.totals.row}</td>
                          {pivotData.columns.map((c) => (
                            <td key={c} className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-white">
                              {pivotMetric.includes('revenue') ? `$${Math.round(pivotData.totals[c] || 0).toLocaleString()}` : Math.round(pivotData.totals[c] || 0).toLocaleString()}
                            </td>
                          ))}
                          <td className="py-2.5 px-3 text-right font-mono text-primary font-black">
                            {pivotMetric.includes('revenue') ? `$${Math.round(pivotData.totals.total || 0).toLocaleString()}` : Math.round(pivotData.totals.total || 0).toLocaleString()}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MARKET BASKET ANALYSIS (APRIORI) */}
        {activeTab === 'mining_basket' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Apriori Association Rule Mining</h2>
                  <p className="text-xs text-slate-500">Discovers frequent co-purchased itemsets across daily customer purchasing baskets.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <span>Min Support:</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.005"
                      max="0.5"
                      value={minSupport}
                      onChange={(e) => setMinSupport(parseFloat(e.target.value))}
                      className="w-16 rounded-md border border-slate-200 px-2 py-1 text-xs dark:border-white/10 dark:bg-slate-700"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <span>Min Conf:</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0.05"
                      max="1.0"
                      value={minConfidence}
                      onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                      className="w-16 rounded-md border border-slate-200 px-2 py-1 text-xs dark:border-white/10 dark:bg-slate-700"
                    />
                  </div>
                  <button
                    onClick={loadMarketBasket}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover"
                  >
                    Run Apriori
                  </button>
                </div>
              </div>

              {basketResult && (
                <div className="mt-5 space-y-6">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-700/40">
                      <p className="text-[10px] font-mono uppercase text-slate-400">Total Baskets Analyzed</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{basketResult.total_baskets}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-700/40">
                      <p className="text-[10px] font-mono uppercase text-slate-400">Frequent Itemsets</p>
                      <p className="text-lg font-bold text-primary">{basketResult.frequent_itemsets?.length || 0}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-700/40">
                      <p className="text-[10px] font-mono uppercase text-slate-400">Association Rules</p>
                      <p className="text-lg font-bold text-emerald-600">{basketResult.total_rules}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">High-Confidence Cross-Selling Association Rules</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
                          <tr>
                            <th className="py-2.5 px-3 uppercase font-semibold">Antecedent (If Bought)</th>
                            <th className="py-2.5 px-3 uppercase font-semibold">Consequent (Also Bought)</th>
                            <th className="py-2.5 px-3 uppercase font-semibold text-right">Support</th>
                            <th className="py-2.5 px-3 uppercase font-semibold text-right">Confidence</th>
                            <th className="py-2.5 px-3 uppercase font-semibold text-right text-primary">Lift</th>
                            <th className="py-2.5 px-3 uppercase font-semibold text-right">Conviction</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                          {basketResult.rules.map((rule, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                              <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                                {rule.antecedent.join(', ')}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">
                                {rule.consequent.join(', ')}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono">{(rule.support * 100).toFixed(1)}%</td>
                              <td className="py-2.5 px-3 text-right font-mono font-medium">{(rule.confidence * 100).toFixed(1)}%</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">{rule.lift.toFixed(2)}x</td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-500">{rule.conviction.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: K-MEANS DEMAND REGIMES */}
        {activeTab === 'mining_clusters' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">K-Means Demand Regime Clustering</h2>
                  <p className="text-xs text-slate-500">Profiles products into operational archetypes by Velocity, Volatility, and Censored Intermittency.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Clusters (k):</span>
                  <select
                    value={nClusters}
                    onChange={(e) => setNClusters(parseInt(e.target.value))}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium dark:border-white/10 dark:bg-slate-700 text-slate-800 dark:text-white"
                  >
                    <option value={3}>k = 3 Clusters</option>
                    <option value={4}>k = 4 Clusters</option>
                    <option value={5}>k = 5 Clusters</option>
                  </select>
                  <button
                    onClick={loadClusters}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover"
                  >
                    Re-cluster
                  </button>
                </div>
              </div>

              {clusterResult && (
                <div className="mt-5 space-y-6">
                  {/* Cluster Archetype Cards */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {clusterResult.clusters.map((c) => (
                      <div key={c.cluster_id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-slate-700/30">
                        <div className="flex items-center justify-between">
                          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            Cluster #{c.cluster_id}
                          </span>
                          <span className="text-xs font-mono text-slate-500">{c.item_count} Series</span>
                        </div>
                        <h4 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{c.archetype}</h4>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{c.recommended_strategy}</p>

                        <div className="mt-3 space-y-1 border-t border-slate-200/60 pt-2 text-[11px] font-mono dark:border-white/5">
                          <div className="flex justify-between text-slate-600 dark:text-slate-400">
                            <span>Mean Daily Units:</span>
                            <span className="font-semibold">{c.centroids.mean_daily_sales}</span>
                          </div>
                          <div className="flex justify-between text-slate-600 dark:text-slate-400">
                            <span>Coeff of Variation (CV):</span>
                            <span className="font-semibold">{c.centroids.coefficient_of_variation}</span>
                          </div>
                          <div className="flex justify-between text-slate-600 dark:text-slate-400">
                            <span>Stockout Rate:</span>
                            <span className="font-semibold">{(c.centroids.stockout_ratio * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Items Table */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Item-Level Cluster Assignments</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
                          <tr>
                            <th className="py-2.5 px-3 uppercase font-semibold">Store</th>
                            <th className="py-2.5 px-3 uppercase font-semibold">Product Name</th>
                            <th className="py-2.5 px-3 uppercase font-semibold">Category</th>
                            <th className="py-2.5 px-3 uppercase font-semibold text-right">Mean Daily Sales</th>
                            <th className="py-2.5 px-3 uppercase font-semibold text-right">Demand Volatility (CV)</th>
                            <th className="py-2.5 px-3 uppercase font-semibold text-right text-rose-500">Stockout Ratio</th>
                            <th className="py-2.5 px-3 uppercase font-semibold text-right">Cluster</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                          {clusterResult.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                              <td className="py-2.5 px-3 font-mono text-slate-500">{item.store_id}</td>
                              <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{item.product_name}</td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{item.category}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-medium">{item.mean_sales}</td>
                              <td className="py-2.5 px-3 text-right font-mono">{item.cv_demand}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-rose-500">{(item.stockout_ratio * 100).toFixed(1)}%</td>
                              <td className="py-2.5 px-3 text-right font-semibold text-primary">Cluster #{item.cluster}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ROLLING SEASONAL ANOMALIES */}
        {activeTab === 'mining_anomalies' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/5">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Rolling Seasonal Anomaly Detection</h2>
                  <p className="text-xs text-slate-500">Identifies sales surges and stockout-induced demand collapses with root-cause attribution.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Z-Score Threshold:</span>
                  <input
                    type="number"
                    step="0.1"
                    min="1.5"
                    max="4.0"
                    value={zThreshold}
                    onChange={(e) => setZThreshold(parseFloat(e.target.value))}
                    className="w-16 rounded-md border border-slate-200 px-2 py-1 text-xs dark:border-white/10 dark:bg-slate-700"
                  />
                  <button
                    onClick={loadAnomalies}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover"
                  >
                    Detect Anomalies
                  </button>
                </div>
              </div>

              {anomalyResult && (
                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Detected {anomalyResult.total_anomalies} anomalies above |z| &gt; {zThreshold}</span>
                    <span>Rolling Window: 7 Days</span>
                  </div>

                  <div className="space-y-2.5">
                    {anomalyResult.anomalies.map((ano, idx) => {
                      const isSpike = ano.anomaly_type === 'Demand Spike'
                      const isStockout = ano.anomaly_type === 'Stockout-Induced Collapse'
                      return (
                        <div
                          key={idx}
                          className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border p-3.5 transition ${
                            isSpike
                              ? 'border-emerald-500/20 bg-emerald-500/5'
                              : isStockout
                              ? 'border-rose-500/20 bg-rose-500/5'
                              : 'border-amber-500/20 bg-amber-500/5'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                isSpike
                                  ? 'bg-emerald-500/10 text-emerald-600'
                                  : isStockout
                                  ? 'bg-rose-500/10 text-rose-600'
                                  : 'bg-amber-500/10 text-amber-600'
                              }`}
                            >
                              {isSpike ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                  {ano.product_name} ({ano.store_id})
                                </span>
                                <span
                                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                    isSpike
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                      : isStockout
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                  }`}
                                >
                                  {ano.anomaly_type}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">{ano.date}</span>
                              </div>
                              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{ano.diagnosis}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-right sm:shrink-0 font-mono text-xs">
                            <div>
                              <span className="block text-[10px] text-slate-400">Observed vs Exp</span>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {ano.observed_sales} / {ano.expected_sales}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[10px] text-slate-400">Z-Score</span>
                              <span className={`font-bold ${isSpike ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {ano.z_score > 0 ? `+${ano.z_score}` : ano.z_score}σ
                              </span>
                            </div>
                            {ano.lost_revenue > 0 && (
                              <div>
                                <span className="block text-[10px] text-rose-500">Lost Rev</span>
                                <span className="font-bold text-rose-600">${Math.round(ano.lost_revenue)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
