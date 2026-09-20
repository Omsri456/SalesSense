export const recentUploads = [
  { name: 'retail_sales_2025.csv', size: '2.4 MB', rows: 18240, status: 'valid', uploaded: '2 days ago' },
  { name: 'store_inventory_q3.csv', size: '860 KB', rows: 5310, status: 'valid', uploaded: '5 days ago' },
  { name: 'sku_master_list.csv', size: '1.1 MB', rows: 3420, status: 'warning', uploaded: '1 week ago' },
  { name: 'holiday_sales_raw.csv', size: '3.7 MB', rows: 24110, status: 'valid', uploaded: '2 weeks ago' },
]

// Columns SalesSense expects to find in an uploaded sales dataset
export const expectedColumns = ['date', 'sku', 'sales', 'store_id']
