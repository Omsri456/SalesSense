import { useState } from 'react'
import Papa from 'papaparse'
import DashboardLayout from '../layouts/DashboardLayout'
import FileDropzone from '../components/FileDropzone'
import UploadProgress from '../components/UploadProgress'
import DatasetPreviewTable from '../components/DatasetPreviewTable'
import ValidationStatus from '../components/ValidationStatus'
import RecentUploadsList from '../components/RecentUploadsList'
import { recentUploads } from '../data/datasetData'
import { AlertCircle } from 'lucide-react'

export default function DatasetUpload() {
  const [fileError, setFileError] = useState(null)
  const [uploading, setUploading] = useState(null) // { fileName, progress, status }
  const [parsed, setParsed] = useState(null) // { headers, rows }

  const handleFile = (file, error) => {
    if (error) {
      setFileError(error)
      setParsed(null)
      return
    }
    setFileError(null)
    setParsed(null)
    setUploading({ fileName: file.name, progress: 0, status: 'uploading' })

    // Simulate an upload progress bar while parsing the file client-side.
    let pct = 0
    const interval = setInterval(() => {
      pct = Math.min(pct + Math.random() * 25, 92)
      setUploading((u) => (u ? { ...u, progress: pct } : u))
    }, 180)

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

  return (
    <DashboardLayout title="Dataset Upload">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <FileDropzone onFile={handleFile} />

          {fileError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {fileError}
            </div>
          )}

          {uploading && <UploadProgress {...uploading} />}

          {parsed && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Dataset Preview</h3>
                <span className="text-xs font-mono text-slate-400">First {parsed.rows.length} rows shown</span>
              </div>
              <DatasetPreviewTable headers={parsed.headers} rows={parsed.rows} />
              <ValidationStatus headers={parsed.headers} />
            </div>
          )}
        </div>

        <div className="space-y-6">
          <RecentUploadsList uploads={recentUploads} />
        </div>
      </div>
    </DashboardLayout>
  )
}
