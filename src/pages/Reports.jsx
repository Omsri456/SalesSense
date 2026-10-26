import { useEffect, useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'
import ReportGenerator from '../components/ReportGenerator'
import ReportsTable from '../components/ReportsTable'
import { reportTypes, dateRangeOptions } from '../data/reportsData'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { FileText, Clock, Layers, AlertCircle } from 'lucide-react'

// Helper to escape CSV cell
function escapeCsv(cell) {
  if (cell == null) return '""'
  const str = String(cell)
  return `"${str.replace(/"/g, '""')}"`
}

// Build authentic CSV content based on report type and backend data
function buildReportCsv(type, storeId, dateRange, data) {
  const lines = []
  const timestamp = new Date().toISOString()
  lines.push(['SalesSense Analytical Platform - Verified Enterprise Report'])
  lines.push(['Report Type', type])
  lines.push(['Store Scope', storeId])
  lines.push(['Date Range Parameter', dateRange])
  lines.push(['Generated At', timestamp])
  lines.push([])

  if (type === 'sales-summary') {
    lines.push(['--- SALES SUMMARY & OLAP ROLLUP ---'])
    lines.push(['Period Start', data.date_start || 'N/A', 'Period End', data.date_end || 'N/A'])
    lines.push(['Gross Warehouse Revenue ($)', data.total_revenue || 0])
    lines.push(['Total Observed Units', data.total_units || 0])
    lines.push(['Unconstrained Latent Demand', data.total_latent_demand || 0])
    lines.push(['Estimated Stockout Lost Revenue ($)', data.lost_revenue_estimate || 0])
    lines.push(['Average Recovery Confidence', `${Math.round((data.average_recovery_confidence || 1.0) * 100)}%`])
    lines.push([])
    lines.push(['Category', 'Gross Revenue ($)', 'Units Sold', 'Latent Demand (Units)', 'Lost Revenue ($)', 'Recovery Confidence', 'Active SKUs'])
    ;(data.categories || []).forEach((c) => {
      lines.push([
        c.category,
        c.revenue,
        c.units_sold,
        c.latent_demand,
        c.lost_revenue_estimate,
        `${Math.round((c.recovery_confidence || 1.0) * 100)}%`,
        c.sku_count,
      ])
    })
    lines.push([])
    lines.push(['Top SKUs by Revenue'])
    lines.push(['SKU ID', 'Product Name', 'Category', 'Unit Price ($)', 'Revenue ($)', 'Units Sold', 'Lost Revenue ($)'])
    ;(data.top_skus || []).forEach((s) => {
      lines.push([s.product_id, s.product_name, s.category, s.unit_price, s.revenue, s.units_sold, s.lost_revenue_estimate])
    })
  } else if (type === 'inventory-health') {
    const recs = data.recommendations || []
    const criticalCount = recs.filter((r) => r.status === 'critical').length
    const expiryCount = recs.filter((r) => r.is_expiry_risk).length
    lines.push(['--- INVENTORY HEALTH & REPLENISHMENT ---'])
    lines.push(['Total SKUs Analyzed', recs.length])
    lines.push(['Critical Stockout Hazards', criticalCount])
    lines.push(['Perishable Expiry Risks', expiryCount])
    lines.push([])
    lines.push([
      'Product ID',
      'Product Name',
      'Category',
      'Current Stock',
      'Days of Cover',
      'Shelf Life (Days)',
      'Status',
      'Suggested Reorder',
      'Waste Risk Units',
      'Waste Risk Cost ($)',
    ])
    recs.forEach((r) => {
      lines.push([
        r.product_id,
        r.product_name,
        r.category,
        r.current_stock,
        Number(r.days_of_cover || 0).toFixed(1),
        r.shelf_life_days,
        r.status,
        r.suggested_order_qty,
        r.waste_risk_units || 0,
        Number(r.waste_risk_cost || 0).toFixed(2),
      ])
    })
  } else if (type === 'forecast-accuracy') {
    lines.push(['--- HISTORICAL FORECAST ACCURACY TRACKING (FR-14) ---'])
    lines.push(['Recent Tournament Champion', data.recent_champion || 'N/A'])
    lines.push(['Recent Holdout wMAPE', Number(data.recent_wmape || 0).toFixed(4)])
    lines.push(['Accuracy Improvement Pct', `${data.accuracy_improvement_pct || 0}%`])
    lines.push(['Total Windows Evaluated', data.total_evaluation_windows || 0])
    lines.push([])
    lines.push(['Window Label', 'Evaluation Date', 'Champion Model', 'Champion wMAPE', 'Champion RMSE', 'Champion R2', 'SARIMA wMAPE', 'Prophet wMAPE', 'LSTM wMAPE'])
    ;(data.history || []).forEach((h) => {
      lines.push([
        h.window,
        h.evaluation_date,
        h.champion_model,
        Number(h.champion_wmape || 0).toFixed(4),
        Number(h.champion_rmse || 0).toFixed(2),
        Number(h.champion_r2 || 0).toFixed(4),
        Number(h.models?.SARIMA?.wmape || 0).toFixed(4),
        Number(h.models?.Prophet?.wmape || 0).toFixed(4),
        Number(h.models?.LSTM?.wmape || 0).toFixed(4),
      ])
    })
  } else if (type === 'model-comparison') {
    const list = Array.isArray(data) ? data : []
    lines.push(['--- TOURNAMENT MODEL BENCHMARK COMPARISON ---'])
    lines.push(['Candidate Models Evaluated', list.length])
    lines.push([])
    lines.push(['Model ID', 'Model Name', 'Architecture', 'Status', 'wMAPE', 'RMSE', 'R2 Score', 'MAE', 'Holdout Trained At'])
    list.forEach((m) => {
      lines.push([
        m.id,
        m.name,
        m.type,
        m.status,
        Number(m.metrics?.wmape || 0).toFixed(4),
        Number(m.metrics?.rmse || 0).toFixed(2),
        Number(m.metrics?.r2 || 0).toFixed(4),
        Number(m.metrics?.mae || 0).toFixed(2),
        m.trainedAt || 'Holdout Evaluation',
      ])
    })
  }

  return lines.map((r) => r.map(escapeCsv).join(',')).join('\r\n')
}

// Build printable HTML content based on report type and backend data
function buildReportHtml(type, typeLabel, storeId, dateRange, data) {
  let contentHtml = ''

  if (type === 'sales-summary') {
    contentHtml = `
      <div class="kpi-grid">
        <div class="kpi-card"><span class="kpi-label">Gross Revenue</span><span class="kpi-val">$${Number(data.total_revenue || 0).toLocaleString()}</span></div>
        <div class="kpi-card"><span class="kpi-label">Units Sold</span><span class="kpi-val">${Number(data.total_units || 0).toLocaleString()}</span></div>
        <div class="kpi-card"><span class="kpi-label">Latent Demand</span><span class="kpi-val">${Number(data.total_latent_demand || 0).toLocaleString()}</span></div>
        <div class="kpi-card"><span class="kpi-label">Recovery Confidence</span><span class="kpi-val">${Math.round((data.average_recovery_confidence || 1) * 100)}%</span></div>
      </div>
      <h3>Category Aggregations (OLAP Star Schema Rollup)</h3>
      <table>
        <thead><tr><th>Category</th><th>Revenue</th><th>Units</th><th>Latent Demand</th><th>Lost Revenue</th><th>Recovery Conf.</th><th>SKUs</th></tr></thead>
        <tbody>
          ${(data.categories || [])
            .map(
              (c) =>
                `<tr><td><strong>${c.category}</strong></td><td>$${Number(c.revenue).toLocaleString()}</td><td>${c.units_sold}</td><td>${c.latent_demand}</td><td>$${c.lost_revenue_estimate}</td><td>${Math.round(c.recovery_confidence * 100)}%</td><td>${c.sku_count}</td></tr>`
            )
            .join('')}
        </tbody>
      </table>
    `
  } else if (type === 'inventory-health') {
    const recs = data.recommendations || []
    contentHtml = `
      <div class="kpi-grid">
        <div class="kpi-card"><span class="kpi-label">Total SKUs Monitored</span><span class="kpi-val">${recs.length}</span></div>
        <div class="kpi-card"><span class="kpi-label">Critical Alerts</span><span class="kpi-val">${recs.filter((r) => r.status === 'critical').length}</span></div>
        <div class="kpi-card"><span class="kpi-label">Expiry Risk SKUs</span><span class="kpi-val">${recs.filter((r) => r.is_expiry_risk).length}</span></div>
      </div>
      <h3>Inventory Replenishment & Expiry Audit</h3>
      <table>
        <thead><tr><th>SKU</th><th>Product</th><th>Category</th><th>Stock</th><th>Days of Cover</th><th>Shelf Life</th><th>Status</th><th>Suggested Reorder</th><th>Waste Risk</th></tr></thead>
        <tbody>
          ${recs
            .map(
              (r) =>
                `<tr><td>${r.product_id}</td><td><strong>${r.product_name}</strong></td><td>${r.category}</td><td>${r.current_stock}</td><td>${Number(r.days_of_cover).toFixed(1)}d</td><td>${r.shelf_life_days}d</td><td>${r.status}</td><td>+${r.suggested_order_qty}</td><td>$${Number(r.waste_risk_cost || 0).toFixed(2)}</td></tr>`
            )
            .join('')}
        </tbody>
      </table>
    `
  } else if (type === 'forecast-accuracy') {
    const history = data.history || []
    contentHtml = `
      <div class="kpi-grid">
        <div class="kpi-card"><span class="kpi-label">Recent Champion</span><span class="kpi-val">${data.recent_champion || 'N/A'}</span></div>
        <div class="kpi-card"><span class="kpi-label">Recent wMAPE</span><span class="kpi-val">${Number(data.recent_wmape || 0).toFixed(4)}</span></div>
        <div class="kpi-card"><span class="kpi-label">Accuracy Gain</span><span class="kpi-val">${data.accuracy_improvement_pct || 0}%</span></div>
      </div>
      <h3>Historical Accuracy Tracking Windows</h3>
      <table>
        <thead><tr><th>Window</th><th>Date</th><th>Champion</th><th>Champion wMAPE</th><th>RMSE</th><th>R2</th><th>SARIMA wMAPE</th><th>Prophet wMAPE</th><th>LSTM wMAPE</th></tr></thead>
        <tbody>
          ${history
            .map(
              (h) =>
                `<tr><td>${h.window}</td><td>${h.evaluation_date}</td><td><strong>${h.champion_model}</strong></td><td>${Number(h.champion_wmape).toFixed(4)}</td><td>${Number(h.champion_rmse).toFixed(2)}</td><td>${Number(h.champion_r2).toFixed(4)}</td><td>${Number(h.models?.SARIMA?.wmape || 0).toFixed(4)}</td><td>${Number(h.models?.Prophet?.wmape || 0).toFixed(4)}</td><td>${Number(h.models?.LSTM?.wmape || 0).toFixed(4)}</td></tr>`
            )
            .join('')}
        </tbody>
      </table>
    `
  } else if (type === 'model-comparison') {
    const list = Array.isArray(data) ? data : []
    contentHtml = `
      <div class="kpi-grid">
        <div class="kpi-card"><span class="kpi-label">Models Evaluated</span><span class="kpi-val">${list.length}</span></div>
      </div>
      <h3>Tournament Benchmarks (Chronological Holdout)</h3>
      <table>
        <thead><tr><th>Model</th><th>Architecture</th><th>Status</th><th>wMAPE</th><th>RMSE</th><th>R2 Score</th><th>MAE</th></tr></thead>
        <tbody>
          ${list
            .map(
              (m) =>
                `<tr><td><strong>${m.name}</strong></td><td>${m.type}</td><td>${m.status}</td><td>${Number(m.metrics?.wmape || 0).toFixed(4)}</td><td>${Number(m.metrics?.rmse || 0).toFixed(2)}</td><td>${Number(m.metrics?.r2 || 0).toFixed(4)}</td><td>${Number(m.metrics?.mae || 0).toFixed(2)}</td></tr>`
            )
            .join('')}
        </tbody>
      </table>
    `
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>SalesSense Report - ${typeLabel}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #1e293b; line-height: 1.5; }
          .header { border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
          .meta { font-size: 12px; color: #64748b; font-family: monospace; margin-top: 4px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
          .kpi-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; display: block; }
          .kpi-val { font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 4px; display: block; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 12px; margin-bottom: 24px; }
          th { background: #f1f5f9; text-align: left; padding: 8px 12px; font-weight: 600; border-bottom: 1px solid #cbd5e1; }
          td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin:0; font-size: 22px; color: #0f172a;">SalesSense · ${typeLabel}</h1>
          <div class="meta">
            Store Scope: ${storeId} &middot; Parameter: ${dateRange} &middot; Generated: ${new Date().toLocaleString()}
          </div>
        </div>
        ${contentHtml}
      </body>
    </html>
  `
}

export default function Reports() {
  const { user } = useAuth()
  const role = user?.role || 'retailer'
  const isRetailer = role === 'retailer'

  const [stores, setStores] = useState([])
  const [selectedStore, setSelectedStore] = useState(() => {
    const assigned = user?.assigned_stores
    return assigned && assigned[0] && assigned[0] !== '*' ? assigned[0] : 'STORE_01'
  })

  const [reports, setReports] = useState([])
  const [selectedType, setSelectedType] = useState(reportTypes[0].id)
  const [dateRange, setDateRange] = useState(dateRangeOptions[1].value)
  const [format, setFormat] = useState('CSV')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)

  // Load authorized stores on mount
  useEffect(() => {
    let active = true
    async function fetchStores() {
      try {
        const storeList = await api.getMyStores()
        if (active && Array.isArray(storeList) && storeList.length > 0) {
          setStores(storeList)
          if (isRetailer) {
            setSelectedStore(storeList[0].store_id || storeList[0])
          }
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
  }, [isRetailer])

  // Real "Generate" caller: fetches live data from respective endpoint
  const handleGenerate = async () => {
    if (isGenerating) return
    setIsGenerating(true)
    setError(null)

    const typeInfo = reportTypes.find((t) => t.id === selectedType) || reportTypes[0]
    const rangeInfo = dateRangeOptions.find((d) => d.value === dateRange) || dateRangeOptions[0]
    const newId = `rep_${Date.now()}`

    const pendingItem = {
      id: newId,
      name: `${typeInfo.name} - ${rangeInfo.label} (${selectedStore})`,
      type: typeInfo.name,
      format,
      size: '—',
      generatedAt: 'Compiling...',
      status: 'generating',
    }
    setReports((prev) => [pendingItem, ...prev])

    try {
      let rawData = null
      if (selectedType === 'sales-summary') {
        rawData = await api.getSalesSummaryReport(selectedStore, dateRange)
      } else if (selectedType === 'inventory-health') {
        rawData = await api.getInventoryRecommendations(selectedStore, 3)
      } else if (selectedType === 'forecast-accuracy') {
        rawData = await api.getAccuracyHistory(selectedStore, 'all')
      } else if (selectedType === 'model-comparison') {
        rawData = await api.getModels()
      }

      const csvContent = buildReportCsv(selectedType, selectedStore, dateRange, rawData)
      const htmlContent = buildReportHtml(selectedType, typeInfo.name, selectedStore, rangeInfo.label, rawData)

      // Exact byte size computation based on format
      const contentForSize = format.toUpperCase() === 'CSV' ? csvContent : htmlContent
      const byteLength = new Blob([contentForSize]).size
      const sizeStr = byteLength < 1024 ? `${byteLength} B` : `${(byteLength / 1024).toFixed(1)} KB`

      const finishedReport = {
        id: newId,
        name: `${typeInfo.name} - ${rangeInfo.label} (${selectedStore})`,
        type: typeInfo.name,
        typeId: selectedType,
        storeId: selectedStore,
        dateRange: rangeInfo.label,
        format,
        size: sizeStr,
        generatedAt: 'Just now',
        status: 'ready',
        csvContent,
        htmlContent,
        data: rawData,
      }

      setReports((prev) => prev.map((r) => (r.id === newId ? finishedReport : r)))
    } catch (err) {
      console.error('Failed to generate real report:', err)
      setError(err.message || 'Report generation failed.')
      setReports((prev) => prev.filter((r) => r.id !== newId))
    } finally {
      setIsGenerating(false)
    }
  }

  // Real "Download" handler: exports generated content
  const handleDownload = (report) => {
    const isCsv = report.format?.toUpperCase() === 'CSV'
    const fileName = report.name.replace(/[^a-z0-9]+/gi, '_')

    if (isCsv) {
      const csvStr = report.csvContent || ''
      const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${fileName}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } else {
      const printWindow = window.open('', '_blank', 'width=900,height=900')
      if (printWindow) {
        printWindow.document.write(report.htmlContent || '')
        printWindow.document.close()
        setTimeout(() => {
          printWindow.print()
        }, 300)
      }
    }
  }

  // Computed summary cards without hardcoded fake counters
  const summaryCardsList = [
    {
      label: 'Generated Reports',
      value: reports.length,
      icon: FileText,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Ready This Session',
      value: reports.filter((r) => r.status === 'ready').length,
      icon: Clock,
      color: 'text-secondary',
      bg: 'bg-secondary/10',
    },
    {
      label: 'Report Categories',
      value: reportTypes.length,
      icon: Layers,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
  ]

  return (
    <DashboardLayout title="Operational & Analytical Reports">
      <div className="space-y-6">
        {/* Error notification if any */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Real Computed Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {summaryCardsList.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
                  {card.label}
                </span>
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bg} ${card.color}`}>
                  <card.icon className="h-4.5 w-4.5" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white font-mono">{card.value}</p>
            </div>
          ))}
        </div>

        <ReportGenerator
          selectedType={selectedType}
          onSelectType={setSelectedType}
          dateRange={dateRange}
          onDateRange={setDateRange}
          selectedStore={selectedStore}
          onSelectedStore={setSelectedStore}
          stores={stores}
          format={format}
          onFormat={setFormat}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          userRole={role}
        />

        <ReportsTable reports={reports} onDownload={handleDownload} />
      </div>
    </DashboardLayout>
  )
}
