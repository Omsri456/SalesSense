import { motion } from 'framer-motion'
import { heroSeries } from '../data/landingData'

const WIDTH = 520
const HEIGHT = 280
const PAD = 24

function toPoints(series, width, height, pad, max) {
  const n = series.length
  const stepX = (width - pad * 2) / (n - 1)
  return series.map((v, i) => {
    if (v === null || v === undefined) return null
    const x = pad + i * stepX
    const y = height - pad - (v / max) * (height - pad * 2)
    return [x, y]
  })
}

function pointsToPath(points) {
  const valid = points.filter(Boolean)
  if (valid.length === 0) return ''
  return valid.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')
}

export default function ForecastHeroChart() {
  const { actual, predicted } = heroSeries
  const max = Math.max(...actual, ...predicted.filter((v) => v !== null)) * 1.15

  const actualPoints = toPoints(actual, WIDTH, HEIGHT, PAD, max)
  const predictedPoints = toPoints(predicted, WIDTH, HEIGHT, PAD, max)

  const actualPath = pointsToPath(actualPoints)
  const predictedPath = pointsToPath(predictedPoints)

  // Confidence band around the predicted segment
  const predictedValid = predicted
    .map((v, i) => (v === null ? null : { i, v }))
    .filter(Boolean)
  const bandTop = predictedValid.map(({ i, v }) => {
    const x = PAD + i * ((WIDTH - PAD * 2) / (actual.length - 1))
    const y = HEIGHT - PAD - ((v * 1.12) / max) * (HEIGHT - PAD * 2)
    return [x, y]
  })
  const bandBottom = predictedValid
    .map(({ i, v }) => {
      const x = PAD + i * ((WIDTH - PAD * 2) / (actual.length - 1))
      const y = HEIGHT - PAD - ((v * 0.88) / max) * (HEIGHT - PAD * 2)
      return [x, y]
    })
    .reverse()
  const bandPath = `${pointsToPath(bandTop)} L${bandBottom
    .map(([x, y]) => `${x},${y}`)
    .join(' L')} Z`

  return (
    <div className="relative rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Forecast preview
          </p>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Actual vs predicted &middot; SKU-1042
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1 text-xs font-mono font-medium text-secondary">
          <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" />
          Live demo
        </span>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full overflow-visible">
        {/* gridlines */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={PAD}
            x2={WIDTH - PAD}
            y1={PAD + f * (HEIGHT - PAD * 2)}
            y2={PAD + f * (HEIGHT - PAD * 2)}
            className="stroke-slate-200 dark:stroke-white/10"
            strokeWidth="1"
          />
        ))}

        {/* confidence band */}
        <motion.path
          d={bandPath}
          fill="var(--color-primary)"
          fillOpacity={0.08}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.6 }}
        />

        {/* actual line */}
        <motion.path
          d={actualPath}
          fill="none"
          stroke="var(--color-secondary)"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: 'easeInOut' }}
        />

        {/* predicted line */}
        <motion.path
          d={predictedPath}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="3"
          strokeDasharray="6 6"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, delay: 0.9, ease: 'easeInOut' }}
        />

        {/* endpoint marker */}
        {predictedPoints[predictedPoints.length - 1] && (
          <motion.circle
            cx={predictedPoints[predictedPoints.length - 1][0]}
            cy={predictedPoints[predictedPoints.length - 1][1]}
            r="5"
            fill="var(--color-accent)"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.9, type: 'spring', stiffness: 300 }}
          />
        )}
      </svg>

      <div className="mt-4 flex items-center gap-5 text-xs font-mono text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-secondary" /> Actual
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-primary" style={{ borderTop: '2px dashed var(--color-primary)' }} />
          Predicted
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-primary/10" /> Confidence band
        </span>
      </div>

      {/* floating stat chip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.1, duration: 0.5 }}
        className="absolute -right-4 -top-4 rounded-2xl border border-white/60 bg-white/90 px-3.5 py-2.5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/90"
      >
        <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Confidence</p>
        <p className="font-mono text-lg font-semibold text-primary">92.4%</p>
      </motion.div>
    </div>
  )
}
