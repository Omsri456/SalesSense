import { BrainCircuit, Sigma, Waves, TreeDeciduous, CheckCircle2, Loader2, PlayCircle } from 'lucide-react'

const typeIcon = {
  'Deep Learning': BrainCircuit,
  Statistical: Sigma,
  'Additive Model': Waves,
}

export default function ModelCard({ model, isTraining, progress, isSelected, isBestModel, onSelect, onTrain }) {
  const Icon = typeIcon[model.type] ?? BrainCircuit

  return (
    <div
      onClick={() => onSelect(model.id)}
      className={`relative cursor-pointer rounded-2xl border bg-white p-5 shadow-sm transition-all dark:bg-slate-800/60 ${
        isSelected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-slate-200 hover:border-primary/40 dark:border-white/10'
      }`}
    >
      {isBestModel && (
        <div className="absolute -top-3 right-4 rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
          ★ Champion (Best Model)
        </div>
      )}
      <div className="flex items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        {model.status === 'trained' ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2.5 py-1 text-[11px] font-medium text-secondary">
            <CheckCircle2 className="h-3 w-3" /> Trained
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-400 dark:bg-white/10">
            Idle
          </span>
        )}
      </div>

      <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{model.name}</h3>
      <p className="text-xs font-mono uppercase tracking-widest text-slate-400">{model.type}</p>
      <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{model.description}</p>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-50 py-2 dark:bg-white/5">
          <p className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">{model.accuracy.toFixed(1)}%</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Accuracy</p>
        </div>
        <div className="rounded-xl bg-slate-50 py-2 dark:bg-white/5">
          <p className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">{model.mae}</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">MAE</p>
        </div>
        <div className="rounded-xl bg-slate-50 py-2 dark:bg-white/5">
          <p className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">{model.rmse}</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">RMSE</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400">Last trained: {model.trainedAt}</p>

      {isTraining ? (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div className="h-full rounded-full bg-primary transition-all duration-150" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-mono text-primary">
            <Loader2 className="h-3 w-3 animate-spin" /> Training... {Math.round(progress)}%
          </p>
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onTrain(model.id)
          }}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-white"
        >
          <PlayCircle className="h-3.5 w-3.5" />
          {model.status === 'trained' ? 'Retrain Model' : 'Train Model'}
        </button>
      )}
    </div>
  )
}
