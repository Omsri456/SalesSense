// Mock SKU-level inventory data used to power stock-health and
// reorder-quantity recommendations on the Inventory page.
// dailySales = average units sold per day (sales velocity)
// leadTimeDays = time for a new order to arrive once placed
export const inventoryItems = [
  { id: 'SKU-1042', name: 'Organic Rolled Oats 1kg', category: 'Bakery & Grains', warehouse: 'Warehouse A', stock: 128, dailySales: 14, leadTimeDays: 5, unitCost: 3.2 },
  { id: 'SKU-2210', name: 'Sparkling Water 12-pack', category: 'Beverages', warehouse: 'Warehouse B', stock: 42, dailySales: 22, leadTimeDays: 4, unitCost: 5.4 },
  { id: 'SKU-3387', name: 'Whole Milk 1L', category: 'Dairy', warehouse: 'Warehouse A', stock: 96, dailySales: 18, leadTimeDays: 2, unitCost: 1.1 },
  { id: 'SKU-4456', name: 'Sea Salt Kettle Chips', category: 'Snacks', warehouse: 'Warehouse C', stock: 210, dailySales: 9, leadTimeDays: 6, unitCost: 2.6 },
  { id: 'SKU-5521', name: 'Frozen Margherita Pizza', category: 'Frozen', warehouse: 'Warehouse B', stock: 31, dailySales: 11, leadTimeDays: 7, unitCost: 4.8 },
  { id: 'SKU-6034', name: 'Free-Range Eggs (12ct)', category: 'Dairy', warehouse: 'Warehouse A', stock: 58, dailySales: 16, leadTimeDays: 3, unitCost: 3.9 },
  { id: 'SKU-6689', name: 'Cold Brew Coffee 4-pack', category: 'Beverages', warehouse: 'Warehouse C', stock: 74, dailySales: 8, leadTimeDays: 5, unitCost: 6.7 },
  { id: 'SKU-7123', name: 'Multi-Surface Cleaner', category: 'Household', warehouse: 'Warehouse B', stock: 19, dailySales: 6, leadTimeDays: 9, unitCost: 4.1 },
  { id: 'SKU-7788', name: 'Sourdough Loaf', category: 'Bakery & Grains', warehouse: 'Warehouse A', stock: 22, dailySales: 13, leadTimeDays: 2, unitCost: 2.9 },
  { id: 'SKU-8214', name: 'Greek Yogurt 500g', category: 'Dairy', warehouse: 'Warehouse C', stock: 63, dailySales: 12, leadTimeDays: 3, unitCost: 2.3 },
  { id: 'SKU-8890', name: 'Roasted Almonds 300g', category: 'Snacks', warehouse: 'Warehouse B', stock: 150, dailySales: 7, leadTimeDays: 8, unitCost: 5.9 },
  { id: 'SKU-9075', name: 'Laundry Detergent Pods', category: 'Household', warehouse: 'Warehouse A', stock: 8, dailySales: 5, leadTimeDays: 10, unitCost: 8.4 },
  { id: 'SKU-9341', name: 'Frozen Mixed Berries', category: 'Frozen', warehouse: 'Warehouse C', stock: 87, dailySales: 10, leadTimeDays: 6, unitCost: 3.5 },
  { id: 'SKU-9902', name: 'Hand Soap Refill', category: 'Personal Care', warehouse: 'Warehouse B', stock: 15, dailySales: 4, leadTimeDays: 7, unitCost: 3.3 },
  { id: 'SKU-1177', name: 'Bagged Salad Mix', category: 'Produce', warehouse: 'Warehouse A', stock: 26, dailySales: 19, leadTimeDays: 1, unitCost: 2.1 },
  { id: 'SKU-1298', name: 'Sourdough Pretzel Bites', category: 'Snacks', warehouse: 'Warehouse C', stock: 112, dailySales: 6, leadTimeDays: 5, unitCost: 2.8 },
]
