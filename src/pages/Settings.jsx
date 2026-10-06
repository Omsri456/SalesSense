import { useState, useEffect } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'
import { useTheme } from '../context/ThemeContext'
import {
  Sliders,
  Package,
  LineChart,
  Moon,
  Sun,
  Database,
  CheckCircle2,
  RotateCcw,
  Sparkles,
} from 'lucide-react'

const SETTINGS_STORAGE_KEY = 'salessense_app_settings'

const defaultSettings = {
  defaultConfidence: '95',
  defaultHorizon: '90',
  selectionMetric: 'wmape',
  serviceLevel: '95',
  defaultLeadTime: 7,
  holdingCostRate: 20,
  orderCost: 50,
  enableAnimations: true,
}

export default function Settings() {
  const { theme, toggleTheme } = useTheme()
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY)
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings
    } catch {
      return defaultSettings
    }
  })

  const [savedMessage, setSavedMessage] = useState('')

  const updateSetting = (key, value) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: value }
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
    setSavedMessage('Configuration updated')
    setTimeout(() => setSavedMessage(''), 2500)
  }

  const resetDefaults = () => {
    setSettings(defaultSettings)
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(defaultSettings))
    setSavedMessage('Reset to factory defaults')
    setTimeout(() => setSavedMessage(''), 2500)
  }

  return (
    <DashboardLayout title="System & Forecasting Settings">
      <div className="space-y-6">
        {/* Header summary */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Platform Preferences</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Customize machine learning evaluation criteria, inventory safety factors, and dashboard defaults.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {savedMessage && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-500">
                <CheckCircle2 className="h-4 w-4" />
                {savedMessage}
              </span>
            )}
            <button
              onClick={resetDefaults}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Defaults
            </button>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Machine Learning Settings */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <LineChart className="h-4.5 w-4.5 text-primary" />
              Forecasting Model Engine (DR-9 / DR-10)
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Configure parameters for the multi-model competitive tournament (Prophet, SARIMA, LightGBM/LSTM).
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Primary Model Selection Metric
                </label>
                <select
                  value={settings.selectionMetric}
                  onChange={(e) => updateSetting('selectionMetric', e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                >
                  <option value="wmape">wMAPE — Weighted Mean Absolute Percentage Error (SRS Recommended)</option>
                  <option value="rmse">RMSE — Root Mean Squared Error (Penalizes Large Outliers)</option>
                  <option value="r2">R² — Coefficient of Determination (Variance Explained)</option>
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  The model scoring the highest performance on this metric during chronological backtesting becomes Champion.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Default Forecast Horizon
                </label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {['30', '60', '90'].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => updateSetting('defaultHorizon', days)}
                      className={`rounded-xl border py-2 text-xs font-semibold transition ${
                        settings.defaultHorizon === days
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-400'
                      }`}
                    >
                      {days} Days
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Forecast Confidence Interval
                </label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {[
                    { val: '80', label: '80% (Narrow Band)' },
                    { val: '95', label: '95% (Industry Standard)' },
                  ].map(({ val, label }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => updateSetting('defaultConfidence', val)}
                      className={`rounded-xl border py-2 text-xs font-semibold transition ${
                        settings.defaultConfidence === val
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Replenishment Settings */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <Package className="h-4.5 w-4.5 text-accent" />
              Inventory & Supply Chain Math (FR-17)
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Formulas for Safety Stock (SS), Reorder Point (ROP), and Economic Order Quantity (EOQ).
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Target Service Level ($Z$-score)
                </label>
                <select
                  value={settings.serviceLevel}
                  onChange={(e) => updateSetting('serviceLevel', e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                >
                  <option value="90">90% Service Level (Z = 1.28) — Lean inventory</option>
                  <option value="95">95% Service Level (Z = 1.65) — Balanced retail default</option>
                  <option value="98">98% Service Level (Z = 2.05) — Critical perishables</option>
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  Determines the multiplier Z in Safety Stock formula: SS = Z &times; &sigma; &times; &radic;L.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Lead Time (days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.defaultLeadTime}
                    onChange={(e) => updateSetting('defaultLeadTime', Number(e.target.value))}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Holding Cost (%/yr)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={settings.holdingCostRate}
                    onChange={(e) => updateSetting('holdingCostRate', Number(e.target.value))}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Fixed Order Cost ($)
                </label>
                <input
                  type="number"
                  min="5"
                  max="1000"
                  value={settings.orderCost}
                  onChange={(e) => updateSetting('orderCost', Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                />
                <p className="mt-1 text-[11px] text-slate-400">Used in EOQ formula: &radic;(2 &times; D &times; S / H).</p>
              </div>
            </div>
          </div>
        </div>

        {/* System & Compliance Information */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
            <Database className="h-4.5 w-4.5 text-emerald-500" />
            System Architecture & Academic Compliance
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-white/5 dark:bg-white/5">
              <span className="font-mono uppercase tracking-wider text-[10px] text-slate-400">Dataset Reference</span>
              <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">FreshRetailNet-50K</p>
              <p className="mt-0.5 text-slate-500 dark:text-slate-400 text-[11px]">Licensed under CC-BY-4.0 (SRS §7.1)</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-white/5 dark:bg-white/5">
              <span className="font-mono uppercase tracking-wider text-[10px] text-slate-400">Methodology</span>
              <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">Ecevit et al. (2023)</p>
              <p className="mt-0.5 text-slate-500 dark:text-slate-400 text-[11px]">LSTM & Prophet multi-model backtesting</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-white/5 dark:bg-white/5">
              <span className="font-mono uppercase tracking-wider text-[10px] text-slate-400">Backend Server</span>
              <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">FastAPI ASGI + Uvicorn</p>
              <p className="mt-0.5 text-emerald-600 dark:text-emerald-400 text-[11px]">Online (Port 8000)</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
