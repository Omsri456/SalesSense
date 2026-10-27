import { useState, useRef, useEffect, useMemo } from 'react'
import { Package, ChevronDown, Check, Search } from 'lucide-react'
import { products as fallbackProducts } from '../data/products'

export default function ProductSelector({ value, onChange, products: propProducts }) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef(null)
  const searchInputRef = useRef(null)

  // Use provided products prop or fallback, ensuring uniqueness by value
  const availableProducts = useMemo(() => {
    const sourceList = Array.isArray(propProducts) && propProducts.length > 0
      ? propProducts
      : fallbackProducts

    const seen = new Set()
    const unique = []
    for (const item of sourceList) {
      if (!item || !item.value) continue
      if (!seen.has(item.value)) {
        seen.add(item.value)
        unique.push(item)
      }
    }
    return unique
  }, [propProducts])

  // Current selected item
  const selectedItem = useMemo(() => {
    return (
      availableProducts.find((p) => p.value === value) || {
        value: value || 'all',
        label: value === 'all' ? 'All Products (Store Aggregate)' : value,
      }
    )
  }, [availableProducts, value])

  // Filter items by search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return availableProducts
    const q = searchQuery.toLowerCase().trim()
    return availableProducts.filter(
      (p) =>
        p.label?.toLowerCase().includes(q) ||
        p.value?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
    )
  }, [availableProducts, searchQuery])

  // Close on outside click and Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    } else {
      setSearchQuery('')
    }
  }, [isOpen])

  const handleSelect = (val) => {
    onChange(val)
    setIsOpen(false)
  }

  // Category badge colors
  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'Beverages':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      case 'Dairy':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
      case 'Frozen':
        return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
      case 'Meat':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
      case 'Produce':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      case 'Seafood':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
    }
  }

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group flex items-center gap-2 rounded-full border border-slate-200/90 bg-white py-1.5 pl-3.5 pr-3 text-sm font-medium text-slate-800 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:border-white/20 dark:hover:bg-slate-800 cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Package className="h-4 w-4 text-primary shrink-0 transition-transform group-hover:scale-110" />
        <span className="max-w-[200px] truncate text-left sm:max-w-[260px]">
          {selectedItem.label}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 dark:text-slate-400 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl backdrop-blur-md transition-all dark:border-white/10 dark:bg-slate-900/95 dark:shadow-black/60">
          {/* Search Bar */}
          <div className="relative mb-2 px-1">
            <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products or categories..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-primary focus:bg-white focus:outline-none dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-primary dark:focus:bg-slate-800"
            />
          </div>

          {/* Product Items List */}
          <div className="max-h-72 overflow-y-auto space-y-0.5 pr-1">
            {filteredProducts.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                No matching FreshRetailNet products found
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isSelected = p.value === value
                const isAll = p.value === 'all'

                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => handleSelect(p.value)}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-semibold dark:bg-primary/20 dark:text-primary-300'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{p.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {p.category && !isAll && (
                        <span
                          className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${getCategoryColor(
                            p.category
                          )}`}
                        >
                          {p.category}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
