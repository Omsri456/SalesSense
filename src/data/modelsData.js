function buildEpochHistory(finalAccuracy, epochs = 10) {
  const start = finalAccuracy - 18
  return Array.from({ length: epochs }, (_, i) => {
    const t = i / (epochs - 1)
    // ease-out curve so accuracy climbs fast then levels off, like real training
    const eased = 1 - Math.pow(1 - t, 2)
    return { epoch: i + 1, accuracy: Number((start + eased * 18).toFixed(1)) }
  })
}

export const initialModels = [
  {
    id: 'lstm',
    name: 'LSTM Network',
    type: 'Deep Learning',
    description: 'Multi-layer recurrent network tuned for long, complex seasonal sequences.',
    accuracy: 94.2,
    mae: 812,
    rmse: 1140,
    trainingTimeSec: 142,
    trainedAt: '2 hours ago',
    status: 'trained',
    hyperparameters: { Layers: 3, Units: 64, Dropout: 0.2, Epochs: 50, 'Learning rate': 0.001 },
  },
  {
    id: 'sarima',
    name: 'SARIMA',
    type: 'Statistical',
    description: 'Seasonal ARIMA tuned on monthly retail seasonality.',
    accuracy: 91.5,
    mae: 960,
    rmse: 1320,
    trainingTimeSec: 38,
    trainedAt: '1 day ago',
    status: 'trained',
    hyperparameters: { Order: '(2,1,2)', 'Seasonal order': '(1,1,1,12)', 'Seasonal period': 12 },
  },
  {
    id: 'prophet',
    name: 'Prophet',
    type: 'Additive Model',
    description: 'Additive model robust to holidays and missing data.',
    accuracy: 92.8,
    mae: 890,
    rmse: 1210,
    trainingTimeSec: 64,
    trainedAt: '3 days ago',
    status: 'trained',
    hyperparameters: { 'Changepoint prior scale': 0.05, 'Seasonality mode': 'multiplicative', Holidays: 'US Retail' },
  },
].map((m) => ({ ...m, epochHistory: m.status === 'trained' ? buildEpochHistory(m.accuracy) : [] }))
