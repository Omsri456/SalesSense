import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function KpiCard({ label, value, delta, trend }) {
  const up = trend === 'up'
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      <p className="text-xs font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
      <div className="mt-2 flex items-end justify-between">
        <p className="text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
        <span
          className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-mono font-medium ${
            up ? 'bg-secondary/10 text-secondary' : 'bg-red-500/10 text-red-500'
          }`}
        >
          {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {delta}
        </span>
      </div>
    </div>
  )
}
