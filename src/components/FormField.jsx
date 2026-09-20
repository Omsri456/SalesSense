export default function FormField({ label, error, ...inputProps }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <input
        {...inputProps}
        className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-white ${
          error
            ? 'border-red-400 focus:ring-red-200'
            : 'border-slate-200 focus:border-primary focus:ring-primary/20 dark:border-white/10'
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
