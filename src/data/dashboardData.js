export const kpis = [
  { label: 'Total Sales', value: '$482,300', delta: '+12.4%', trend: 'up' },
  { label: 'Forecast Accuracy', value: '94.2%', delta: '+1.8%', trend: 'up' },
  { label: 'Datasets Uploaded', value: '18', delta: '+3', trend: 'up' },
  { label: 'Inventory Health', value: '86%', delta: '-2.1%', trend: 'down' },
]

export const salesTrend = [
  { month: 'Jan', sales: 32000 },
  { month: 'Feb', sales: 35500 },
  { month: 'Mar', sales: 31000 },
  { month: 'Apr', sales: 39800 },
  { month: 'May', sales: 42100 },
  { month: 'Jun', sales: 45900 },
  { month: 'Jul', sales: 48200 },
  { month: 'Aug', sales: 46700 },
  { month: 'Sep', sales: 51300 },
  { month: 'Oct', sales: 55600 },
  { month: 'Nov', sales: 60200 },
  { month: 'Dec', sales: 64100 },
]

export const forecastGraph = [
  { month: 'Sep', actual: 51300, predicted: 50800 },
  { month: 'Oct', actual: 55600, predicted: 54900 },
  { month: 'Nov', actual: 60200, predicted: 59100 },
  { month: 'Dec', actual: 64100, predicted: 63400 },
  { month: 'Jan', actual: null, predicted: 67200 },
  { month: 'Feb', actual: null, predicted: 70500 },
  { month: 'Mar', actual: null, predicted: 68900 },
]

export const recentActivity = [
  { text: 'Dataset "retail_sales_2025.csv" uploaded', time: '12 minutes ago' },
  { text: 'LSTM model training completed', time: '1 hour ago' },
  { text: 'Forecast generated for SKU-1042', time: '3 hours ago' },
  { text: 'Inventory report exported as PDF', time: 'Yesterday' },
  { text: 'SARIMA model training started', time: 'Yesterday' },
]

export const upcomingAlerts = [
  { text: 'SKU-2210 stock projected to run low in 6 days', level: 'warning' },
  { text: 'Warehouse B inventory exceeds safety threshold', level: 'info' },
  { text: 'Prophet model accuracy dropped below 90%', level: 'critical' },
]
