import { Package } from 'lucide-react'
import { products } from '../data/products'

export default function ProductSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-3 pr-1.5 text-sm dark:border-white/10 dark:bg-slate-800/60">
      <Package className="h-4 w-4 text-slate-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-full bg-transparent pr-2 text-sm font-medium text-slate-700 focus:outline-none dark:text-slate-200"
      >
        {products.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  )
}
