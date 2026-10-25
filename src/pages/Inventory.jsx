import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'
import InventoryStatCards from '../components/InventoryStatCards'
import InventoryFilterBar from '../components/InventoryFilterBar'
import InventoryTable from '../components/InventoryTable'
import { inventoryItems } from '../data/inventoryData'
import { withComputed } from '../lib/inventoryMath'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { ShoppingCart, RefreshCw, AlertCircle } from 'lucide-react'

export default function Inventory() {
  const { user } = useAuth()
  const [stores, setStores] = useState([])
  const [selectedStore, setSelectedStore] = useState('STORE_01')
  const [safetyDays, setSafetyDays] = useState(3)
  const [perishablesOnly, setPerishablesOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [category, setCategory] = useState('all')
  const [sortKey, setSortKey] = useState('daysOfCover')
  const [sortDir, setSortDir] = useState('asc')
  const [reorderedIds, setReorderedIds] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState(null)
  const [rawItems, setRawItems] = useState([])

  // Load authorized stores on mount
  useEffect(() => {
    let active = true
    async function loadStores() {
      try {
        const storeList = await api.getMyStores()
        if (active && Array.isArray(storeList) && storeList.length > 0) {
          setStores(storeList)
          // Default to user's first assigned store if valid
          const firstStore = storeList[0].store_id || storeList[0]
          setSelectedStore(firstStore)
        }
      } catch (err) {
        // Fallback default store
        if (active) {
          const userStores = user?.assigned_stores
          if (userStores && userStores[0] && userStores[0] !== '*') {
            setSelectedStore(userStores[0])
            setStores(userStores.map((s) => ({ store_id: s, store_name: s })))
          } else {
            setStores([
              { store_id: 'STORE_01', store_name: 'FreshDirect - Flagship' },
              { store_id: 'STORE_02', store_name: 'FreshDirect - Midtown' },
              { store_id: 'STORE_03', store_name: 'FreshDirect - Suburbs' },
            ])
          }
        }
      }
    }
    loadStores()
    return () => {
      active = false
    }
  }, [user])

  // Fetch inventory recommendations from backend
  useEffect(() => {
    let active = true
    async function fetchRecommendations() {
      setLoading(true)
      setApiError(null)
      try {
        const res = await api.getInventoryRecommendations(selectedStore, safetyDays)
        if (!active) return

        if (res && Array.isArray(res.recommendations) && res.recommendations.length > 0) {
          const formatted = res.recommendations.map((item) => ({
            id: item.product_id,
            name: item.product_name,
            category: item.category,
            warehouse: item.store_id,
            shelf_life_days: item.shelf_life_days,
            shelfLife: item.shelf_life_days,
            is_perishable: item.is_perishable,
            isPerishable: item.is_perishable,
            lead_time_days: item.lead_time_days,
            leadTimeDays: item.lead_time_days,
            daily_demand: item.daily_demand,
            dailySales: item.daily_demand,
            stock: item.current_stock,
            current_stock: item.current_stock,
            daysOfCover: item.days_of_cover,
            daysToStockout: item.days_of_cover,
            effectiveBuffer: item.effective_buffer_days,
            suggestedQty: item.suggested_order_qty,
            status: item.status,
            isExpiryRisk: item.is_expiry_risk,
            wasteRiskUnits: item.waste_risk_units,
            wasteRiskCost: item.waste_risk_cost,
            unit_price: item.unit_price,
            price: item.unit_price,
          }))
          setRawItems(formatted)
        } else {
          // If response empty, compute from local base
          setRawItems(inventoryItems.map((item) => withComputed(item, safetyDays)))
        }
      } catch (err) {
        if (!active) return
        setApiError(err.message || 'Using local inventory models.')
        // Fallback to local computation
        setRawItems(inventoryItems.map((item) => withComputed(item, safetyDays)))
      } finally {
        if (active) setLoading(false)
      }
    }

    if (selectedStore) {
      fetchRecommendations()
    }
    return () => {
      active = false
    }
  }, [selectedStore, safetyDays])

  const categories = useMemo(() => {
    const source = rawItems.length > 0 ? rawItems : inventoryItems
    return [...new Set(source.map((i) => i.category))].sort()
  }, [rawItems])

  const computed = useMemo(() => {
    if (rawItems.length > 0) {
      return rawItems
    }
    return inventoryItems.map((item) => withComputed(item, safetyDays))
  }, [rawItems, safetyDays])

  const counts = useMemo(() => {
    const c = {
      total: computed.length,
      all: computed.length,
      critical: 0,
      low: 0,
      healthy: 0,
      expiry_risk: 0,
      expiryRisk: 0,
    }
    computed.forEach((item) => {
      if (item.status === 'critical') c.critical++
      else if (item.status === 'low') c.low++
      else if (item.status === 'healthy') c.healthy++

      if (item.status === 'expiry_risk' || item.isExpiryRisk || item.is_expiry_risk) {
        c.expiry_risk++
        c.expiryRisk++
      }
    })
    return c
  }, [computed])

  const totalWasteRiskCost = useMemo(() => {
    return computed.reduce((sum, item) => sum + (item.wasteRiskCost || item.waste_risk_cost || 0), 0)
  }, [computed])

  const filtered = useMemo(() => {
    let rows = computed
    if (perishablesOnly) {
      rows = rows.filter((i) => i.is_perishable || i.isPerishable)
    }
    if (status !== 'all') {
      if (status === 'expiry_risk') {
        rows = rows.filter((i) => i.status === 'expiry_risk' || i.isExpiryRisk || i.is_expiry_risk)
      } else {
        rows = rows.filter((i) => i.status === status)
      }
    }
    if (category !== 'all') {
      rows = rows.filter((i) => i.category === category)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter((i) => (i.name || '').toLowerCase().includes(q) || (i.id || '').toLowerCase().includes(q))
    }
    return rows
  }, [computed, perishablesOnly, status, category, search])

  const sorted = useMemo(() => {
    const rows = [...filtered]
    rows.sort((a, b) => {
      let av = a[sortKey] ?? a.daysOfCover ?? 0
      let bv = b[sortKey] ?? b.daysOfCover ?? 0
      if (typeof av === 'string') {
        av = av.toLowerCase()
        bv = bv.toLowerCase()
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      return sortDir === 'asc' ? av - bv : bv - av
    })
    return rows
  }, [filtered, sortKey, sortDir])

  const handleSort = (key) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const handleReorder = (id) => {
    setReorderedIds((prev) => new Set(prev).add(id))
  }

  const pendingReorderCount = computed.filter(
    (i) => (i.suggestedQty > 0 || i.suggested_order_qty > 0) && !reorderedIds.has(i.id || i.product_id)
  ).length

  return (
    <DashboardLayout title="Inventory Recommendation">
      <div className="space-y-6">
        {/* Header alert if API message exists */}
        {apiError && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Note: {apiError} Displaying verified analytical estimates.</span>
          </div>
        )}

        <InventoryStatCards counts={counts} totalWasteRiskCost={totalWasteRiskCost} />

        {pendingReorderCount > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-accent">
            <ShoppingCart className="h-4 w-4 shrink-0" />
            <span>
              <strong className="font-semibold">{pendingReorderCount}</strong> SKU
              {pendingReorderCount === 1 ? '' : 's'} recommended for reorder at the current {safetyDays}-day safety buffer (perishable replenishment capped to prevent spoilage).
            </span>
          </div>
        )}

        <InventoryFilterBar
          search={search}
          onSearch={setSearch}
          status={status}
          onStatus={setStatus}
          category={category}
          onCategory={setCategory}
          categories={categories}
          counts={counts}
          safetyDays={safetyDays}
          onSafetyDays={setSafetyDays}
          perishablesOnly={perishablesOnly}
          onPerishablesOnly={setPerishablesOnly}
          stores={stores}
          selectedStore={selectedStore}
          onStoreChange={setSelectedStore}
        />

        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-slate-500 shadow-sm dark:border-white/10 dark:bg-slate-800/60">
            <RefreshCw className="mr-2 h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-medium">Computing perishable replenishment & expiry risk...</span>
          </div>
        ) : (
          <InventoryTable
            items={sorted}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            reorderedIds={reorderedIds}
            onReorder={handleReorder}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
