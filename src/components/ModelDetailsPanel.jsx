import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function ModelDetailsPanel({ model }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{model.name} &middot; Training Curve</h3>
        <span className="text-xs font-mono text-slate-400">Accuracy per epoch</span>
      </div>

      {model.epochHistory.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={model.epochHistory} margin={{ left: -20, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="epoch" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }}
              formatter={(v) => [`${v}%`, 'Accuracy']}
              labelFormatter={(l) => `Epoch ${l}`}
            />
            <Line type="monotone" dataKey="accuracy" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[200px] items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400 dark:bg-white/5">
          No training history yet &middot; train this model to see its curve
        </div>
      )}

      <div className="mt-5 border-t border-slate-100 pt-4 dark:border-white/10">
        <p className="mb-2 text-xs font-mono uppercase tracking-widest text-slate-400">Hyperparameters</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {Object.entries(model.hyperparameters).map(([key, value]) => (
            <div key={key}>
              <dt className="text-[11px] text-slate-400">{key}</dt>
              <dd className="font-mono text-sm font-medium text-slate-700 dark:text-slate-200">{String(value)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
