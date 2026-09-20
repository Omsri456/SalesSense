import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'

export default function ModelComparisonChart({ models, selectedId }) {
  const data = models.map((m) => ({ name: m.name, accuracy: m.accuracy, id: m.id }))

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Model Comparison</h3>
        <span className="text-xs font-mono text-slate-400">Accuracy %</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ left: -20, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={[80, 100]} />
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} formatter={(v) => [`${v}%`, 'Accuracy']} />
          <Bar dataKey="accuracy" radius={[8, 8, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.id} fill={d.id === selectedId ? '#2563EB' : '#CBD5E1'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
