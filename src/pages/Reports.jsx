import { useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'
import ReportGenerator from '../components/ReportGenerator'
import ReportsTable from '../components/ReportsTable'
import { sampleReports, reportTypes, dateRangeOptions } from '../data/reportsData'
import { FileText, Clock, CalendarClock } from 'lucide-react'

const summaryCards = (reports) => [
  { label: 'Total Reports', value: reports.length, icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
  { label: 'Generated This Month', value: reports.filter((r) => /hour|Yesterday|day/.test(r.generatedAt)).length, icon: Clock, color: 'text-secondary', bg: 'bg-secondary/10' },
  { label: 'Scheduled', value: 2, icon: CalendarClock, color: 'text-accent', bg: 'bg-accent/10' },
]

export default function Reports() {
  const [reports, setReports] = useState(sampleReports)
  const [selectedType, setSelectedType] = useState(reportTypes[0].id)
  const [dateRange, setDateRange] = useState(dateRangeOptions[1].value)
  const [format, setFormat] = useState('PDF')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = () => {
    if (isGenerating) return
    setIsGenerating(true)

    const typeInfo = reportTypes.find((t) => t.id === selectedType)
    const rangeInfo = dateRangeOptions.find((d) => d.value === dateRange)
    const newId = `r${Date.now()}`

    setReports((prev) => [
      {
        id: newId,
        name: `${typeInfo.name} - ${rangeInfo.label}`,
        type: typeInfo.name,
        format,
        size: '—',
        generatedAt: 'Generating...',
        status: 'generating',
      },
      ...prev,
    ])

    setTimeout(() => {
      setReports((prev) =>
        prev.map((r) =>
          r.id === newId
            ? {
                ...r,
                status: 'ready',
                generatedAt: 'Just now',
                size: `${(180 + Math.random() * 1000).toFixed(0)} KB`,
              }
            : r
        )
      )
      setIsGenerating(false)
    }, 1800)
  }

  const handleDownload = (report) => {
    const isCsv = report.format?.toUpperCase() === 'CSV'
    const fileName = `${report.name.replace(/[^a-z0-9]+/gi, '_')}`

    if (isCsv) {
      // Build structured CSV data (FR-13 compliance)
      const rows = [
        ['SalesSense Demand Forecasting Platform - Automated Report'],
        ['Report Name', report.name],
        ['Report Type', report.type],
        ['Generated At', report.generatedAt || new Date().toISOString()],
        ['Model Selected', 'LSTM Champion Model (wMAPE: 0.058, RMSE: 364.8, R2: 0.941)'],
        [],
        ['Period', 'Store ID', 'Product SKU', 'Category', 'Forecast Units', 'Lower 95% CI', 'Upper 95% CI', 'Reorder Point', 'Status'],
        ['Month 1', 'STORE_01', 'SKU-ORG-01', 'Produce', '1420', '1306', '1533', '250', 'Optimal'],
        ['Month 2', 'STORE_01', 'SKU-ORG-01', 'Produce', '1480', '1332', '1628', '250', 'Optimal'],
        ['Month 3', 'STORE_01', 'SKU-ORG-01', 'Produce', '1540', '1355', '1724', '250', 'Optimal'],
        ['Month 1', 'STORE_01', 'SKU-BAK-04', 'Bakery', '980', '901', '1058', '120', 'Review'],
        ['Month 2', 'STORE_01', 'SKU-BAK-04', 'Bakery', '1020', '918', '1122', '120', 'Review'],
        ['Month 3', 'STORE_01', 'SKU-BAK-04', 'Bakery', '1060', '932', '1187', '120', 'Review'],
        ['Month 1', 'STORE_01', 'SKU-BEV-09', 'Beverages', '2100', '1932', '2268', '180', 'Optimal'],
        ['Month 2', 'STORE_01', 'SKU-BEV-09', 'Beverages', '2190', '1971', '2409', '180', 'Optimal'],
        ['Month 3', 'STORE_01', 'SKU-BEV-09', 'Beverages', '2280', '2006', '2553', '180', 'Optimal'],
      ]

      const csvContent = rows
        .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\r\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${fileName}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      // PDF Printable Document Window (FR-13 compliance)
      const printWindow = window.open('', '_blank', 'width=800,height=900')
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${report.name} - SalesSense Report</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 36px; color: #0f172a; line-height: 1.5; }
                .header { border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 24px; }
                .logo { font-size: 22px; font-weight: 800; color: #0284c7; letter-spacing: -0.5px; }
                .meta { margin-top: 8px; font-size: 13px; color: #64748b; }
                .badge { display: inline-block; padding: 4px 10px; background: #e0f2fe; color: #0369a1; border-radius: 9999px; font-size: 12px; font-weight: 600; }
                .champion { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin: 20px 0; }
                .champ-title { font-weight: 700; color: #15803d; font-size: 14px; }
                table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
                th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
                th { background-color: #f8fafc; font-weight: 600; color: #334155; }
                .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; }
                @media print { body { padding: 0; } }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="logo">SalesSense AI</div>
                <h1 style="margin: 8px 0 4px 0; font-size: 20px;">${report.name}</h1>
                <div class="meta">
                  <span>Type: <strong>${report.type}</strong></span> &bull; 
                  <span>Generated: <strong>${report.generatedAt || 'Today'}</strong></span> &bull; 
                  <span class="badge">Official Export</span>
                </div>
              </div>

              <div class="champion">
                <div class="champ-title">&#9733; Champion Model: LSTM Neural Network</div>
                <div style="font-size: 12px; color: #166534; margin-top: 4px;">
                  Auto-selected via lowest holdout wMAPE (0.058) & RMSE (364.8). 95% Confidence Interval active.
                </div>
              </div>

              <h3 style="font-size: 15px; margin-top: 24px; color: #1e293b;">Demand Forecast & Replenishment Schedule</h3>
              <table>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Forecast (Units)</th>
                    <th>95% Interval</th>
                    <th>Reorder Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Next 30 Days</td>
                    <td>Organic Avocados</td>
                    <td>Produce</td>
                    <td><strong>1,420</strong></td>
                    <td>1,306 - 1,533</td>
                    <td><span style="color: #16a34a; font-weight: 600;">Optimal</span></td>
                  </tr>
                  <tr>
                    <td>Next 60 Days</td>
                    <td>Organic Avocados</td>
                    <td>Produce</td>
                    <td><strong>1,480</strong></td>
                    <td>1,332 - 1,628</td>
                    <td><span style="color: #16a34a; font-weight: 600;">Optimal</span></td>
                  </tr>
                  <tr>
                    <td>Next 90 Days</td>
                    <td>Organic Avocados</td>
                    <td>Produce</td>
                    <td><strong>1,540</strong></td>
                    <td>1,355 - 1,724</td>
                    <td><span style="color: #16a34a; font-weight: 600;">Optimal</span></td>
                  </tr>
                  <tr>
                    <td>Next 30 Days</td>
                    <td>Cold Brew 32oz</td>
                    <td>Beverages</td>
                    <td><strong>2,100</strong></td>
                    <td>1,932 - 2,268</td>
                    <td><span style="color: #16a34a; font-weight: 600;">Optimal</span></td>
                  </tr>
                  <tr>
                    <td>Next 30 Days</td>
                    <td>Artisan Sourdough</td>
                    <td>Bakery</td>
                    <td><strong>980</strong></td>
                    <td>901 - 1,058</td>
                    <td><span style="color: #ea580c; font-weight: 600;">Reorder Triggered</span></td>
                  </tr>
                </tbody>
              </table>

              <div class="footer">
                SalesSense Autonomous Retail Intelligence &bull; FreshRetailNet-50K Engine &bull; Confidential
              </div>
              <script>
                window.onload = function() {
                  window.print();
                };
              </script>
            </body>
          </html>
        `)
        printWindow.document.close()
      }
    }
  }

  return (
    <DashboardLayout title="Reports">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {summaryCards(reports).map((c) => (
            <div key={c.label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${c.bg} ${c.color}`}>
                <c.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">{c.label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{c.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-1">
            <ReportGenerator
              selectedType={selectedType}
              onSelectType={setSelectedType}
              dateRange={dateRange}
              onDateRange={setDateRange}
              format={format}
              onFormat={setFormat}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
            />
          </div>
          <div className="xl:col-span-2">
            <ReportsTable reports={reports} onDownload={handleDownload} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
