import { motion } from 'framer-motion'

export default function UploadProgress({ fileName, progress, status }) {
  const label = status === 'done' ? 'Upload complete' : status === 'error' ? 'Upload failed' : 'Uploading…'
  const barColor = status === 'error' ? 'bg-red-500' : status === 'done' ? 'bg-secondary' : 'bg-primary'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-800/60">
      <div className="flex items-center justify-between text-sm">
        <span className="truncate font-medium text-slate-700 dark:text-slate-200">{fileName}</span>
        <span className="ml-2 shrink-0 font-mono text-xs text-slate-400">{Math.round(progress)}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: 'easeOut' }}
        />
      </div>
      <p className="mt-1.5 text-xs text-slate-400">{label}</p>
    </div>
  )
}
