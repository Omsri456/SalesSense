import { useState, useEffect } from 'react'
import Papa from 'papaparse'
import DashboardLayout from '../layouts/DashboardLayout'
import FileDropzone from '../components/FileDropzone'
import UploadProgress from '../components/UploadProgress'
import DatasetPreviewTable from '../components/DatasetPreviewTable'
import ValidationStatus from '../components/ValidationStatus'
import { api } from '../services/api'
import { AlertCircle, CheckCircle2, Database, Hash, Layers } from 'lucide-react'

export default function DatasetUpload() {
  const [fileError, setFileError] = useState(null)
  const [uploading, setUploading] = useState(null)
  const [parsed, setParsed] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)

  const [datasetSummary, setDatasetSummary] = useState(null)

  useEffect(() => {
    loadSummary()
  }, [])

  const loadSummary = async () => {
    try {
      const data = await api.getDatasetSummary()
      setDatasetSummary(data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleFile = (file, error) => {
    if (error) {
      setFileError(error)
      setParsed(null)
      setSelectedFile(null)
      return
    }
    setFileError(null)
    setParsed(null)
    setSelectedFile(file)
    setUploading({ fileName: file.name, progress: 0, status: 'uploading' })

    let pct = 0
    const interval = setInterval(() => {
      pct = Math.min(pct + 30, 95)
      setUploading((u) => (u ? { ...u, progress: pct } : u))
    }, 120)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: 8,
      complete: (results) => {
        clearInterval(interval)
        setUploading({ fileName: file.name, progress: 100, status: 'done' })
        setParsed({ headers: results.meta.fields || [], rows: results.data })
      },
      error: () => {
        clearInterval(interval)
        setUploading({ fileName: file.name, progress: 100, status: 'error' })
      },
    })
  }

  const handleIngestToWarehouse = async () => {
    if (!selectedFile || isSubmitting) return
    setIsSubmitting(true)
    setFileError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const res = await api.uploadDataset(formData)
      setUploadResult(res)
      await loadSummary()
    } catch (err) {
      setFileError(err.message || 'Dataset upload failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DashboardLayout title="Dataset Ingestion & Provenance">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {/* Active Staging & Provenance Card */}
          {datasetSummary && (
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-sky-500/5 to-transparent p-5 dark:border-primary/30">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary">
                  Active Staging Dataset & Provenance
                </h3>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs font-mono">
                <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Total Rows</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white">
                    {datasetSummary.total_rows?.toLocaleString()}
                  </span>
                </div>
                <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Stockout Records</span>
                  <span className="text-base font-bold text-rose-600">
                    {datasetSummary.stockout_records?.toLocaleString()}
                  </span>
                </div>
                <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Date Window</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {datasetSummary.date_coverage?.start} → {datasetSummary.date_coverage?.end}
                  </span>
                </div>
                <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Categories</span>
                  <span className="text-base font-bold text-primary">
                    {datasetSummary.categories?.length || 6}
                  </span>
                </div>
              </div>

              {datasetSummary.sha256_checksum && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2 text-[11px] font-mono text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
                  <Hash className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">SHA-256 Provenance: {datasetSummary.sha256_checksum}</span>
                </div>
              )}
            </div>
          )}

          <FileDropzone onFile={handleFile} />

          {fileError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {fileError}
            </div>
          )}

          {uploadResult && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              {uploadResult.message} ({uploadResult.rows_ingested?.toLocaleString()} rows ingested).
            </div>
          )}

          {uploading && <UploadProgress {...uploading} />}

          {parsed && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Dataset Header Preview</h3>
                <span className="text-xs font-mono text-slate-400">First {parsed.rows.length} rows shown</span>
              </div>
              <DatasetPreviewTable headers={parsed.headers} rows={parsed.rows} />
              <ValidationStatus headers={parsed.headers} />

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleIngestToWarehouse}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-50"
                >
                  <Layers className="h-4 w-4" />
                  {isSubmitting ? 'Ingesting into Warehouse...' : 'Ingest Dataset into MongoDB & Data Warehouse'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Research Alignment Checklist</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              FreshRetailNet-50K factor compliance verification:
            </p>
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span><code>stock_hour6_22_cnt</code> (In-stock operational hours)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span><code>management_group_id</code> (Retail management tier)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span><code>first/second/third_category_id</code> (Category taxonomy)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span><code>precpt, avg_temperature, avg_humidity</code> (Weather exog)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span><code>is_stockout_affected</code> & Censored Demand Recovery</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
