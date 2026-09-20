// Shared stock-health math for the Inventory Recommendation feature.
// Kept in one place so the table, stat cards, and filters all agree
// on what "critical / low / healthy" means for a given safety buffer.

export function daysToStockout(item) {
  if (item.dailySales <= 0) return Infinity
  return item.stock / item.dailySales
}

export function reorderThresholdDays(item, safetyDays) {
  return item.leadTimeDays + safetyDays
}

export function getStatus(item, safetyDays) {
  const days = daysToStockout(item)
  const threshold = reorderThresholdDays(item, safetyDays)
  if (days <= item.leadTimeDays) return 'critical'
  if (days <= threshold) return 'low'
  return 'healthy'
}

export function suggestedReorderQty(item, safetyDays) {
  const threshold = reorderThresholdDays(item, safetyDays)
  const target = item.dailySales * threshold
  return Math.max(0, Math.ceil(target - item.stock))
}

export function withComputed(item, safetyDays) {
  const days = daysToStockout(item)
  return {
    ...item,
    daysToStockout: days,
    status: getStatus(item, safetyDays),
    suggestedQty: suggestedReorderQty(item, safetyDays),
  }
}
