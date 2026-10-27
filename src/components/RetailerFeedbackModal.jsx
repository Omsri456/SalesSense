import { useState } from 'react'
import { X, Send, CheckCircle2, AlertTriangle, PackageCheck, AlertCircle } from 'lucide-react'
import { api } from '../services/api'

export default function RetailerFeedbackModal({ isOpen, onClose, item, storeId, onSuccess }) {
  const [feedbackType, setFeedbackType] = useState('report_stock_count')
  const [actualStock, setActualStock] = useState(item?.stock ?? item?.current_stock ?? '')
  const [reorderQty, setReorderQty] = useState(item?.suggestedQty ?? item?.suggested_order_qty ?? '')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  if (!isOpen || !item) return null

  const targetStore = item.warehouse || item.store_id || storeId || 'STORE_01'
  const productId = item.id || item.product_id

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const payload = {
        store_id: targetStore,
        product_id: productId,
        feedback_type: feedbackType,
        notes: notes.trim() || undefined,
      }

      if (feedbackType === 'report_stock_count') {
        const parsed = parseInt(actualStock, 10)
        if (isNaN(parsed) || parsed < 0) {
          setError('Please enter a valid stock count (>= 0).')
          setSubmitting(false)
          return
        }
        payload.actual_stock = parsed
      } else if (feedbackType === 'confirmed_reorder') {
        const parsed = parseInt(reorderQty, 10)
        if (isNaN(parsed) || parsed <= 0) {
          setError('Please enter a valid reorder quantity (> 0).')
          setSubmitting(false)
          return
        }
        payload.reorder_quantity = parsed
      }

      await api.submitFeedback(payload)
      setSubmitted(true)
      if (onSuccess) onSuccess(payload)
      setTimeout(() => {
        setSubmitted(false)
        onClose()
      }, 1400)
    } catch (err) {
      setError(err.message || 'Failed to submit feedback.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-800">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
        >
          <X className="h-5 w-5" />
        </button>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Feedback Submitted</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Logged to telemetry log for ML model evaluation and inventory auditing.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Retailer Feedback</h3>
              </div>
              <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
                {item.name || item.product_name} ({productId}) &middot; {targetStore}
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Action Type</label>
              <div className="grid grid-cols-1 gap-2">
                <label className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs cursor-pointer transition ${feedbackType === 'report_stock_count' ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'}`}>
                  <input
                    type="radio"
                    name="feedbackType"
                    value="report_stock_count"
                    checked={feedbackType === 'report_stock_count'}
                    onChange={() => setFeedbackType('report_stock_count')}
                    className="text-primary focus:ring-primary"
                  />
                  <span>Report Actual Stock Count (Cycle Check)</span>
                </label>

                <label className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs cursor-pointer transition ${feedbackType === 'flag_inaccurate_forecast' ? 'border-amber-500 bg-amber-500/5 text-amber-600 font-medium' : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'}`}>
                  <input
                    type="radio"
                    name="feedbackType"
                    value="flag_inaccurate_forecast"
                    checked={feedbackType === 'flag_inaccurate_forecast'}
                    onChange={() => setFeedbackType('flag_inaccurate_forecast')}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  <span>Flag Forecast as Inaccurate</span>
                </label>

                <label className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs cursor-pointer transition ${feedbackType === 'confirmed_reorder' ? 'border-emerald-500 bg-emerald-500/5 text-emerald-600 font-medium' : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'}`}>
                  <input
                    type="radio"
                    name="feedbackType"
                    value="confirmed_reorder"
                    checked={feedbackType === 'confirmed_reorder'}
                    onChange={() => setFeedbackType('confirmed_reorder')}
                    className="text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Confirm Reorder Placed</span>
                </label>
              </div>
            </div>

            {feedbackType === 'report_stock_count' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Physical On-Shelf Count
                </label>
                <input
                  type="number"
                  min="0"
                  value={actualStock}
                  onChange={(e) => setActualStock(e.target.value)}
                  placeholder="e.g. 45"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-900 placeholder-slate-400 focus:border-primary focus:bg-white focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-primary dark:focus:bg-slate-800"
                />
              </div>
            )}

            {feedbackType === 'confirmed_reorder' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Reorder Quantity Dispatched (Units)
                </label>
                <input
                  type="number"
                  min="1"
                  value={reorderQty}
                  onChange={(e) => setReorderQty(e.target.value)}
                  placeholder="e.g. 50"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-900 placeholder-slate-400 focus:border-primary focus:bg-white focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-primary dark:focus:bg-slate-800"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Operational Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder={
                  feedbackType === 'flag_inaccurate_forecast'
                    ? 'e.g. Local heatwave increased demand by 40% over model prediction.'
                    : 'e.g. Verified by physical count in warehouse aisle 3.'
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-primary focus:bg-white focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-primary dark:focus:bg-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
