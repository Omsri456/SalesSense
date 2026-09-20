import { seededRandom } from '../lib/random'
import { productScale } from './products'

const baseYear = [
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

export function generateSalesTrend(sku) {
  const scale = productScale(sku)
  const rand = seededRandom('sales-trend', sku)
  return baseYear.map((m) => ({
    month: m.month,
    sales: Math.round(m.sales * scale * (0.96 + rand() * 0.08)),
  }))
}
