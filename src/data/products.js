import { seededRandom } from '../lib/random'

export const products = [
  { value: 'all', label: 'All Products' },
  { value: 'SKU-1042', label: 'SKU-1042 - Organic Rolled Oats' },
  { value: 'SKU-2210', label: 'SKU-2210 - Sparkling Water 12-pack' },
  { value: 'SKU-5521', label: 'SKU-5521 - Frozen Margherita Pizza' },
  { value: 'SKU-7788', label: 'SKU-7788 - Sourdough Loaf' },
  { value: 'SKU-9075', label: 'SKU-9075 - Laundry Detergent Pods' },
]

// A single SKU is a slice of total revenue. Deterministic per SKU so the
// same product always scales the same way across every chart/page.
export function productScale(sku) {
  if (sku === 'all') return 1
  const rand = seededRandom('product-scale', sku)
  return 0.06 + rand() * 0.05
}
