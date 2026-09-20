export default function ForecastTable({ forecast }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-800/60">
      <div className="border-b border-slate-100 p-5 dark:border-white/10">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Forecast by Period</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-white/5">
            <tr>
              {['Period', 'Predicted', 'Low', 'High', 'Range'].map((h) => (
                <th key={h} className="px-5 py-2.5 font-mono text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {forecast.map((f, i) => (
              <tr key={i}>
                <td className="px-5 py-2.5 font-medium text-slate-700 dark:text-slate-200">{f.month}</td>
                <td className="px-5 py-2.5 font-mono text-slate-800 dark:text-slate-100">${f.predicted.toLocaleString()}</td>
                <td className="px-5 py-2.5 font-mono text-slate-400">${f.low.toLocaleString()}</td>
                <td className="px-5 py-2.5 font-mono text-slate-400">${f.high.toLocaleString()}</td>
                <td className="px-5 py-2.5 font-mono text-xs text-slate-400">
                  &plusmn;{(((f.high - f.low) / 2 / f.predicted) * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
