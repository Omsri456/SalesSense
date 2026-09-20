import { useMemo, useState } from 'react'
import DashboardLayout from '../layouts/DashboardLayout'
import InventoryStatCards from '../components/InventoryStatCards'
import InventoryFilterBar from '../components/InventoryFilterBar'
import InventoryTable from '../components/InventoryTable'
import { inventoryItems } from '../data/inventoryData'
import { withComputed } from '../lib/inventoryMath'
import { ShoppingCart } from 'lucide-react'

export default function Inventory() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [category, setCategory] = useState('all')
  const [safetyDays, setSafetyDays] = useState(3)
  const [sortKey, setSortKey] = useState('daysToStockout')
  const [sortDir, setSortDir] = useState('asc')
  const [reorderedIds, setReorderedIds] = useState(new Set())

  const categories = useMemo(
    () => [...new Set(inventoryItems.map((i) => i.category))].sort(),
    []
  )

  const computed = useMemo(
    () => inventoryItems.map((item) => withComputed(item, safetyDays)),
    [safetyDays]
  )

  const counts = useMemo(() => {
    const c = { all: computed.length, critical: 0, low: 0, healthy: 0 }
    computed.forEach((item) => c[item.status]++)
    return c
  }, [computed])

  const filtered = useMemo(() => {
    let rows = computed
    if (status !== 'all') rows = rows.filter((i) => i.status === status)
    if (category !== 'all') rows = rows.filter((i) => i.category === category)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter((i) => i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q))
    }
    return rows
  }, [computed, status, category, search])

  const sorted = useMemo(() => {
    const rows = [...filtered]
    rows.sort((a, b) => {
      let av = a[sortKey]
      let bv = b[sortKey]
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
    (i) => i.suggestedQty > 0 && !reorderedIds.has(i.id)
  ).length

  return (
    <DashboardLayout title="Inventory Recommendation">
      <div className="space-y-6">
        <InventoryStatCards counts={counts} />

        {pendingReorderCount > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-accent">
            <ShoppingCart className="h-4 w-4 shrink-0" />
            <span>
              <strong className="font-semibold">{pendingReorderCount}</strong> SKU
              {pendingReorderCount === 1 ? '' : 's'} recommended for reorder at the current {safetyDays}-day safety buffer.
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
        />

        <InventoryTable
          items={sorted}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          reorderedIds={reorderedIds}
          onReorder={handleReorder}
        />
      </div>
    </DashboardLayout>
  )
}
