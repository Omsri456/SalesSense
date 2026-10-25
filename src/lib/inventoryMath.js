// Shared stock-health and perishable inventory intelligence math.
// Implements research-aligned perishable quantity caps and expiry risk detection.

export function isPerishable(item) {
  const shelfLife = item.shelf_life_days || item.shelfLife || 14
  return shelfLife <= 7
}

export function daysOfCover(item) {
  const demand = item.dailySales || item.daily_demand || item.daily_velocity || 0
  const stock = item.stock ?? item.current_stock ?? 0
  if (demand <= 0) return stock > 0 ? 999 : 0
  return Number((stock / demand).toFixed(1))
}

export function effectiveSafetyBuffer(item, safetyDays = 3) {
  const shelfLife = item.shelf_life_days || item.shelfLife || 14
  // Perishables cannot afford standard long buffers without spoiling
  if (shelfLife <= 7) {
    return Math.min(safetyDays, Math.max(1, Math.floor(shelfLife * 0.3)))
  }
  return safetyDays
}

export function isExpiryRisk(item) {
  const shelfLife = item.shelf_life_days || item.shelfLife || 14
  const cover = daysOfCover(item)
  return cover > shelfLife
}

export function wasteRiskUnits(item) {
  const shelfLife = item.shelf_life_days || item.shelfLife || 14
  const demand = item.dailySales || item.daily_demand || 0
  const stock = item.stock ?? item.current_stock ?? 0
  if (demand <= 0) return stock
  const willSellBeforeSpoiling = demand * shelfLife
  return Math.max(0, Math.round(stock - willSellBeforeSpoiling))
}

export function wasteRiskCost(item) {
  const price = item.price || item.unit_price || 5.0
  return Number((wasteRiskUnits(item) * price).toFixed(2))
}

export function reorderThresholdDays(item, safetyDays = 3) {
  const leadTime = item.leadTimeDays || item.lead_time_days || 3
  const buffer = effectiveSafetyBuffer(item, safetyDays)
  return leadTime + buffer
}

export function suggestedReorderQty(item, safetyDays = 3) {
  const demand = item.dailySales || item.daily_demand || 0
  const stock = item.stock ?? item.current_stock ?? 0
  const shelfLife = item.shelf_life_days || item.shelfLife || 14
  const leadTime = item.leadTimeDays || item.lead_time_days || 3
  const buffer = effectiveSafetyBuffer(item, safetyDays)

  if (demand <= 0) return 0

  // 1. Unconstrained target to cover lead time + safety buffer
  const ropNeed = demand * (leadTime + buffer) - stock

  // 2. Perishable ceiling: never order more than can sell before expiration
  const maxSellable = demand * shelfLife - stock
  const perishableCeiling = Math.max(0, Math.floor(maxSellable))

  // 3. Recommended order respects both needs and perishability ceiling
  const rawQty = Math.max(0, Math.ceil(ropNeed))
  return Math.min(rawQty, perishableCeiling)
}

export function getStatus(item, safetyDays = 3) {
  const cover = daysOfCover(item)
  const shelfLife = item.shelf_life_days || item.shelfLife || 14
  const leadTime = item.leadTimeDays || item.lead_time_days || 3
  const threshold = reorderThresholdDays(item, safetyDays)

  if (cover > shelfLife) return 'expiry_risk'
  if (cover <= leadTime) return 'critical'
  if (cover <= threshold) return 'low'
  if (cover > shelfLife * 0.9 && shelfLife <= 14) return 'overstocked'
  return 'healthy'
}

export function withComputed(item, safetyDays = 3) {
  const cover = daysOfCover(item)
  const shelfLife = item.shelf_life_days || item.shelfLife || 14
  const wasteUnits = wasteRiskUnits(item)
  const wasteCost = wasteRiskCost(item)

  return {
    ...item,
    shelfLife,
    isPerishable: isPerishable(item),
    daysOfCover: cover,
    daysToStockout: cover,
    effectiveBuffer: effectiveSafetyBuffer(item, safetyDays),
    status: getStatus(item, safetyDays),
    suggestedQty: suggestedReorderQty(item, safetyDays),
    isExpiryRisk: isExpiryRisk(item),
    wasteRiskUnits: wasteUnits,
    wasteRiskCost: wasteCost,
  }
}
