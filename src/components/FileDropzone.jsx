import { useRef, useState } from 'react'
import { UploadCloud, FileSpreadsheet } from 'lucide-react'

export default function FileDropzone({ onFile }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = (files) => {
    const file = files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      onFile(null, 'Only .csv files are supported.')
      return
    }
    onFile(file, null)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        handleFiles(e.dataTransfer.files)
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
        dragging
          ? 'border-primary bg-primary/5'
          : 'border-slate-300 bg-white hover:border-primary/60 hover:bg-primary/5 dark:border-white/15 dark:bg-slate-800/60'
      }`}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {dragging ? <FileSpreadsheet className="h-6 w-6" /> : <UploadCloud className="h-6 w-6" />}
      </span>
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Drag and drop a CSV file here, or <span className="text-primary">browse</span>
        </p>
        <p className="mt-1 text-xs text-slate-400">Supports .csv up to 25MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}
