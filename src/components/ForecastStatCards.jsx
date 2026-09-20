import { TrendingUp, TrendingDown, Target, BrainCircuit } from 'lucide-react'

export default function ForecastStatCards({ totalPredicted, growthPct, confidence, modelLabel, periods }) {
  const up = growthPct >= 0
  const cards = [
    {
      label: `Predicted Total (${periods} periods)`,
      value: `$${totalPredicted.toLocaleString()}`,
      icon: up ? TrendingUp : TrendingDown,
      color: up ? 'text-secondary' : 'text-red-500',
      bg: up ? 'bg-secondary/10' : 'bg-red-500/10',
    },
    {
      label: 'Projected Growth',
      value: `${up ? '+' : ''}${growthPct.toFixed(1)}%`,
      icon: up ? TrendingUp : TrendingDown,
      color: up ? 'text-secondary' : 'text-red-500',
      bg: up ? 'bg-secondary/10' : 'bg-red-500/10',
    },
    {
      label: 'Confidence Score',
      value: `${confidence}%`,
      icon: Target,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Model Used',
      value: modelLabel,
      icon: BrainCircuit,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">{c.label}</p>
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.bg} ${c.color}`}>
              <c.icon className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{c.value}</p>
        </div>
      ))}
    </div>
  )
}
