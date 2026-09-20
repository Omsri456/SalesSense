export const reportTypes = [
  {
    id: 'sales-summary',
    name: 'Sales Summary',
    description: 'Revenue, growth and top SKUs for a chosen date range.',
  },
  {
    id: 'inventory-health',
    name: 'Inventory Health',
    description: 'Stock coverage, reorder recommendations and warehouse status.',
  },
  {
    id: 'forecast-accuracy',
    name: 'Forecast Accuracy',
    description: 'Actual vs predicted performance for a chosen model.',
  },
  {
    id: 'model-comparison',
    name: 'Model Comparison',
    description: 'Side-by-side accuracy, MAE and RMSE across all models.',
  },
]

export const dateRangeOptions = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last quarter' },
  { value: 'ytd', label: 'Year to date' },
]

export const formatOptions = ['PDF', 'XLSX', 'CSV']

export const sampleReports = [
  { id: 'r1', name: 'Monthly Sales Summary - November 2025', type: 'Sales Summary', format: 'PDF', size: '1.2 MB', generatedAt: '2 hours ago', status: 'ready' },
  { id: 'r2', name: 'Inventory Health Report - Q4 2025', type: 'Inventory Health', format: 'XLSX', size: '640 KB', generatedAt: 'Yesterday', status: 'ready' },
  { id: 'r3', name: 'Forecast Accuracy - LSTM vs SARIMA', type: 'Forecast Accuracy', format: 'PDF', size: '980 KB', generatedAt: '3 days ago', status: 'ready' },
  { id: 'r4', name: 'Model Comparison Report', type: 'Model Comparison', format: 'CSV', size: '210 KB', generatedAt: '1 week ago', status: 'ready' },
  { id: 'r5', name: 'Weekly Sales Digest - Week 46', type: 'Sales Summary', format: 'PDF', size: '845 KB', generatedAt: '1 week ago', status: 'ready' },
  { id: 'r6', name: 'Inventory Health Report - Q3 2025', type: 'Inventory Health', format: 'XLSX', size: '590 KB', generatedAt: '3 weeks ago', status: 'ready' },
]
