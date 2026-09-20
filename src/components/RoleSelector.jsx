import { Shield, Store, FlaskConical } from 'lucide-react'

const roles = [
  { id: 'admin', label: 'Admin', icon: Shield },
  { id: 'retailer', label: 'Retailer', icon: Store },
  { id: 'ml_engineer', label: 'ML Engineer', icon: FlaskConical },
]

export default function RoleSelector({ value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">I am a</label>
      <div className="grid grid-cols-3 gap-2">
        {roles.map(({ id, label, icon: Icon }) => {
          const active = value === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-all ${
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-white/10 dark:text-slate-400 dark:hover:border-white/20'
              }`}
            >
              <Icon className="h-4.5 w-4.5" strokeWidth={2} />
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
