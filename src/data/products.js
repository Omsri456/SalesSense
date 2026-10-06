import { seededRandom } from '../lib/random'
import { inventoryItems } from './inventoryData'

export const products = [
  { value: 'all', label: 'All Products (Aggregate Store Revenue)' },
  ...inventoryItems.map((item) => ({
    value: item.id,
    label: `${item.id} - ${item.name}`,
  })),
]

// Deterministic per-SKU multiplier so "All Products" reads bigger than a single SKU,
// and individual products maintain consistent scales across charts.
export function productScale(sku) {
  if (sku === 'all') return 1
  const rand = seededRandom('product-scale', sku)
  return 0.04 + rand() * 0.06
}
