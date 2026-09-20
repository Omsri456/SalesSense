import { PackageSearch, AlertOctagon, AlertTriangle, CheckCircle2 } from 'lucide-react'

const cards = [
  { key: 'total', label: 'Total SKUs', icon: PackageSearch, color: 'text-primary', bg: 'bg-primary/10' },
  { key: 'critical', label: 'Critical', icon: AlertOctagon, color: 'text-red-500', bg: 'bg-red-500/10' },
  { key: 'low', label: 'Low Stock', icon: AlertTriangle, color: 'text-accent', bg: 'bg-accent/10' },
  { key: 'healthy', label: 'Healthy', icon: CheckCircle2, color: 'text-secondary', bg: 'bg-secondary/10' },
]

export default function InventoryStatCards({ counts }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ key, label, icon: Icon, color, bg }) => (
        <div
          key={key}
          className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60"
        >
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg} ${color}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{counts[key]}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
