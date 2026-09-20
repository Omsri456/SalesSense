export default function DatasetPreviewTable({ headers, rows }) {
  if (!headers?.length) return null

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-left text-sm">
          <thead className="bg-slate-50 dark:bg-white/5">
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap px-4 py-2.5 font-mono text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {rows.map((row, i) => (
              <tr key={i} className="bg-white dark:bg-slate-800/40">
                {headers.map((h) => (
                  <td key={h} className="whitespace-nowrap px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {row[h]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
