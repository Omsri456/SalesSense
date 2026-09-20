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
    const content = `SalesSense Report\n\nName: ${report.name}\nType: ${report.type}\nFormat: ${report.format}\nGenerated: ${report.generatedAt}\n\nThis is a sample export for demo purposes.`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.name.replace(/[^a-z0-9]+/gi, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
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
