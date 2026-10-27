import { seededRandom } from '../lib/random'

// Authentic FreshRetailNet-50K products active in our data warehouse
export const products = [
  { value: 'all', label: 'All Products (Store Aggregate)', category: 'All' },
  { value: 'cat:Beverages', label: 'Category: Beverages (Aggregated)', category: 'Beverages' },
  { value: 'cat:Dairy', label: 'Category: Dairy (Aggregated)', category: 'Dairy' },
  { value: 'cat:Frozen', label: 'Category: Frozen (Aggregated)', category: 'Frozen' },
  { value: 'cat:Meat', label: 'Category: Meat (Aggregated)', category: 'Meat' },
  { value: 'cat:Produce', label: 'Category: Produce (Aggregated)', category: 'Produce' },
  { value: 'cat:Seafood', label: 'Category: Seafood (Aggregated)', category: 'Seafood' },
  { value: 'SKU-296', label: 'SKU-296 (Beverages · Item 296)', category: 'Beverages' },
  { value: 'SKU-310', label: 'SKU-310 (Beverages · Item 310)', category: 'Beverages' },
  { value: 'SKU-362', label: 'SKU-362 (Meat · Item 362)', category: 'Meat' },
  { value: 'SKU-379', label: 'SKU-379 (Seafood · Item 379)', category: 'Seafood' },
  { value: 'SKU-4', label: 'SKU-4 (Seafood · Item 4)', category: 'Seafood' },
  { value: 'SKU-411', label: 'SKU-411 (Produce · Item 411)', category: 'Produce' },
  { value: 'SKU-415', label: 'SKU-415 (Meat · Item 415)', category: 'Meat' },
  { value: 'SKU-487', label: 'SKU-487 (Dairy · Item 487)', category: 'Dairy' },
  { value: 'SKU-496', label: 'SKU-496 (Beverages · Item 496)', category: 'Beverages' },
  { value: 'SKU-580', label: 'SKU-580 (Seafood · Item 580)', category: 'Seafood' },
  { value: 'SKU-596', label: 'SKU-596 (Seafood · Item 596)', category: 'Seafood' },
  { value: 'SKU-633', label: 'SKU-633 (Beverages · Item 633)', category: 'Beverages' },
  { value: 'SKU-638', label: 'SKU-638 (Beverages · Item 638)', category: 'Beverages' },
  { value: 'SKU-644', label: 'SKU-644 (Frozen · Item 644)', category: 'Frozen' },
  { value: 'SKU-740', label: 'SKU-740 (Seafood · Item 740)', category: 'Seafood' },
  { value: 'SKU-788', label: 'SKU-788 (Dairy · Item 788)', category: 'Dairy' },
  { value: 'SKU-793', label: 'SKU-793 (Dairy · Item 793)', category: 'Dairy' },
  { value: 'SKU-816', label: 'SKU-816 (Frozen · Item 816)', category: 'Frozen' },
  { value: 'SKU-829', label: 'SKU-829 (Dairy · Item 829)', category: 'Dairy' },
  { value: 'SKU-830', label: 'SKU-830 (Meat · Item 830)', category: 'Meat' },
  { value: 'SKU-834', label: 'SKU-834 (Produce · Item 834)', category: 'Produce' },
]

// Deterministic per-SKU multiplier so "All Products" reads bigger than a single SKU,
// and individual products maintain consistent scales across charts.
export function productScale(sku) {
  if (sku === 'all') return 1
  const rand = seededRandom('product-scale', sku)
  return 0.04 + rand() * 0.06
}
