// SKU-level retail inventory benchmark dataset derived from FreshRetailNet-50K categories.
// dailySales = average units sold per day (sales velocity)
// leadTimeDays = time for a new order to arrive once placed
export const inventoryItems = [
  // Bakery & Grains
  { id: 'SKU-1042', name: 'Organic Rolled Oats 1kg', category: 'Bakery & Grains', warehouse: 'Warehouse A', stock: 128, dailySales: 14, leadTimeDays: 5, unitCost: 3.2 },
  { id: 'SKU-7788', name: 'Artisan Sourdough Loaf', category: 'Bakery & Grains', warehouse: 'Warehouse A', stock: 22, dailySales: 13, leadTimeDays: 2, unitCost: 2.9 },
  { id: 'SKU-1450', name: 'Whole Wheat Sandwich Bread', category: 'Bakery & Grains', warehouse: 'Warehouse B', stock: 45, dailySales: 20, leadTimeDays: 2, unitCost: 1.8 },
  { id: 'SKU-1892', name: 'Gluten-Free Bagels 4pk', category: 'Bakery & Grains', warehouse: 'Warehouse C', stock: 35, dailySales: 6, leadTimeDays: 4, unitCost: 4.2 },

  // Beverages
  { id: 'SKU-2210', name: 'Sparkling Mineral Water 12pk', category: 'Beverages', warehouse: 'Warehouse B', stock: 42, dailySales: 22, leadTimeDays: 4, unitCost: 5.4 },
  { id: 'SKU-6689', name: 'Cold Brew Coffee 4-pack', category: 'Beverages', warehouse: 'Warehouse C', stock: 74, dailySales: 8, leadTimeDays: 5, unitCost: 6.7 },
  { id: 'SKU-2341', name: 'Pure Squeezed Orange Juice 1.5L', category: 'Beverages', warehouse: 'Warehouse A', stock: 28, dailySales: 15, leadTimeDays: 2, unitCost: 3.8 },
  { id: 'SKU-2760', name: 'Organic Green Tea (20 bags)', category: 'Beverages', warehouse: 'Warehouse B', stock: 110, dailySales: 7, leadTimeDays: 6, unitCost: 2.5 },
  { id: 'SKU-2980', name: 'Almond Milk Unsweetened 1L', category: 'Beverages', warehouse: 'Warehouse C', stock: 65, dailySales: 12, leadTimeDays: 3, unitCost: 2.4 },

  // Dairy & Eggs
  { id: 'SKU-3387', name: 'Organic Whole Milk 1L', category: 'Dairy & Eggs', warehouse: 'Warehouse A', stock: 96, dailySales: 18, leadTimeDays: 2, unitCost: 1.1 },
  { id: 'SKU-6034', name: 'Free-Range Brown Eggs (12ct)', category: 'Dairy & Eggs', warehouse: 'Warehouse A', stock: 58, dailySales: 16, leadTimeDays: 3, unitCost: 3.9 },
  { id: 'SKU-8214', name: 'Authentic Greek Yogurt 500g', category: 'Dairy & Eggs', warehouse: 'Warehouse C', stock: 63, dailySales: 12, leadTimeDays: 3, unitCost: 2.3 },
  { id: 'SKU-3490', name: 'Sharp Cheddar Cheese Block 250g', category: 'Dairy & Eggs', warehouse: 'Warehouse B', stock: 82, dailySales: 9, leadTimeDays: 5, unitCost: 4.5 },
  { id: 'SKU-3820', name: 'Unsalted Sweet Cream Butter 454g', category: 'Dairy & Eggs', warehouse: 'Warehouse A', stock: 18, dailySales: 11, leadTimeDays: 3, unitCost: 4.1 },

  // Fresh Produce
  { id: 'SKU-1177', name: 'Organic Spring Salad Mix 200g', category: 'Fresh Produce', warehouse: 'Warehouse A', stock: 26, dailySales: 19, leadTimeDays: 1, unitCost: 2.1 },
  { id: 'SKU-4112', name: 'Hass Avocados (4-pack)', category: 'Fresh Produce', warehouse: 'Warehouse B', stock: 32, dailySales: 14, leadTimeDays: 2, unitCost: 3.5 },
  { id: 'SKU-4250', name: 'Cavendish Bananas 1kg', category: 'Fresh Produce', warehouse: 'Warehouse A', stock: 115, dailySales: 35, leadTimeDays: 1, unitCost: 1.2 },
  { id: 'SKU-4680', name: 'Organic Honeycrisp Apples 1kg', category: 'Fresh Produce', warehouse: 'Warehouse C', stock: 48, dailySales: 10, leadTimeDays: 3, unitCost: 4.6 },
  { id: 'SKU-4890', name: 'Vine-Ripened Tomatoes 500g', category: 'Fresh Produce', warehouse: 'Warehouse B', stock: 14, dailySales: 12, leadTimeDays: 2, unitCost: 2.8 },

  // Snacks & Confectionery
  { id: 'SKU-4456', name: 'Sea Salt Kettle Chips 150g', category: 'Snacks', warehouse: 'Warehouse C', stock: 210, dailySales: 9, leadTimeDays: 6, unitCost: 2.6 },
  { id: 'SKU-8890', name: 'Roasted Salted Almonds 300g', category: 'Snacks', warehouse: 'Warehouse B', stock: 150, dailySales: 7, leadTimeDays: 8, unitCost: 5.9 },
  { id: 'SKU-1298', name: 'Sourdough Pretzel Bites 250g', category: 'Snacks', warehouse: 'Warehouse C', stock: 112, dailySales: 6, leadTimeDays: 5, unitCost: 2.8 },
  { id: 'SKU-4910', name: 'Dark Chocolate Sea Salt Bar 100g', category: 'Snacks', warehouse: 'Warehouse A', stock: 85, dailySales: 11, leadTimeDays: 4, unitCost: 2.7 },

  // Frozen Foods
  { id: 'SKU-5521', name: 'Frozen Margherita Pizza', category: 'Frozen Foods', warehouse: 'Warehouse B', stock: 31, dailySales: 11, leadTimeDays: 7, unitCost: 4.8 },
  { id: 'SKU-9341', name: 'Frozen Mixed Berries 500g', category: 'Frozen Foods', warehouse: 'Warehouse C', stock: 87, dailySales: 10, leadTimeDays: 6, unitCost: 3.5 },
  { id: 'SKU-5680', name: 'Frozen Wild Salmon Fillets 400g', category: 'Frozen Foods', warehouse: 'Warehouse A', stock: 19, dailySales: 7, leadTimeDays: 5, unitCost: 9.2 },
  { id: 'SKU-5890', name: 'Sweet Potato Fries 600g', category: 'Frozen Foods', warehouse: 'Warehouse B', stock: 54, dailySales: 8, leadTimeDays: 6, unitCost: 3.1 },

  // Meat & Seafood
  { id: 'SKU-6120', name: 'Fresh Chicken Breast Fillets 500g', category: 'Meat & Seafood', warehouse: 'Warehouse A', stock: 24, dailySales: 21, leadTimeDays: 1, unitCost: 5.8 },
  { id: 'SKU-6340', name: 'Grass-Fed Lean Ground Beef 500g', category: 'Meat & Seafood', warehouse: 'Warehouse B', stock: 16, dailySales: 15, leadTimeDays: 2, unitCost: 6.5 },
  { id: 'SKU-6550', name: 'Wild Atlantic Cod Fillets 350g', category: 'Meat & Seafood', warehouse: 'Warehouse C', stock: 12, dailySales: 6, leadTimeDays: 3, unitCost: 7.9 },

  // Household & Cleaning
  { id: 'SKU-7123', name: 'Multi-Surface Cleaner 750ml', category: 'Household', warehouse: 'Warehouse B', stock: 19, dailySales: 6, leadTimeDays: 9, unitCost: 4.1 },
  { id: 'SKU-9075', name: 'Laundry Detergent Pods (32ct)', category: 'Household', warehouse: 'Warehouse A', stock: 8, dailySales: 5, leadTimeDays: 10, unitCost: 8.4 },
  { id: 'SKU-7430', name: 'Recycled Paper Towels (6 Rolls)', category: 'Household', warehouse: 'Warehouse C', stock: 68, dailySales: 9, leadTimeDays: 7, unitCost: 6.2 },
  { id: 'SKU-7650', name: 'Biodegradable Trash Bags (30ct)', category: 'Household', warehouse: 'Warehouse B', stock: 45, dailySales: 4, leadTimeDays: 8, unitCost: 4.9 },

  // Personal Care
  { id: 'SKU-9902', name: 'Gentle Hand Soap Refill 500ml', category: 'Personal Care', warehouse: 'Warehouse B', stock: 15, dailySales: 4, leadTimeDays: 7, unitCost: 3.3 },
  { id: 'SKU-9450', name: 'Herbal Moisturizing Shampoo 400ml', category: 'Personal Care', warehouse: 'Warehouse C', stock: 38, dailySales: 3, leadTimeDays: 9, unitCost: 5.6 },
]
