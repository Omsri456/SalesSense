import { useEffect, useRef, useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'
import ModelCard from '../components/ModelCard'
import ModelDetailsPanel from '../components/ModelDetailsPanel'
import ModelComparisonChart from '../components/ModelComparisonChart'
import { initialModels } from '../data/modelsData'

function buildEpochHistory(finalAccuracy, epochs = 10) {
  const start = finalAccuracy - 18
  return Array.from({ length: epochs }, (_, i) => {
    const t = i / (epochs - 1)
    const eased = 1 - Math.pow(1 - t, 2)
    return { epoch: i + 1, accuracy: Number((start + eased * 18).toFixed(1)) }
  })
}

export default function Models() {
  const [models, setModels] = useState(initialModels)
  const [selectedId, setSelectedId] = useState(initialModels[0].id)
  const [progressById, setProgressById] = useState({})
  const intervalsRef = useRef({})

  useEffect(() => {
    return () => {
      Object.values(intervalsRef.current).forEach(clearInterval)
    }
  }, [])

  const handleTrain = (id) => {
    if (progressById[id] !== undefined) return
    setProgressById((p) => ({ ...p, [id]: 0 }))

    intervalsRef.current[id] = setInterval(() => {
      setProgressById((p) => {
        const current = p[id] ?? 0
        const next = Math.min(100, current + 8 + Math.random() * 10)

        if (next >= 100) {
          clearInterval(intervalsRef.current[id])
          delete intervalsRef.current[id]

          setModels((prev) =>
            prev.map((m) => {
              if (m.id !== id) return m
              const jitter = (Math.random() - 0.3) * 2.2
              const newAccuracy = Math.max(80, Math.min(99, Number((m.accuracy + jitter).toFixed(1))))
              return {
                ...m,
                accuracy: newAccuracy,
                mae: Math.max(400, Math.round(m.mae - Math.random() * 40)),
                rmse: Math.max(600, Math.round(m.rmse - Math.random() * 50)),
                trainedAt: 'Just now',
                status: 'trained',
                epochHistory: buildEpochHistory(newAccuracy),
              }
            })
          )

          const { [id]: _removed, ...rest } = p
          return rest
        }

        return { ...p, [id]: next }
      })
    }, 220)
  }

  const selectedModel = models.find((m) => m.id === selectedId) ?? models[0]

  return (
    <DashboardLayout title="Model Training">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {models.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              isTraining={progressById[model.id] !== undefined}
              progress={progressById[model.id] ?? 0}
              isSelected={selectedId === model.id}
              onSelect={setSelectedId}
              onTrain={handleTrain}
            />
          ))}
        </div>

        <ModelComparisonChart models={models} selectedId={selectedId} />

        <ModelDetailsPanel model={selectedModel} />
      </div>
    </DashboardLayout>
  )
}
