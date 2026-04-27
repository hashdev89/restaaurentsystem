'use client'

import { useState, useMemo, useEffect } from 'react'
import { MenuItem, MenuItemCustomizationOption, MenuItemSize } from '@/types'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Textarea } from './ui/Textarea'
import { Select } from './ui/Select'
import { Trash2 } from 'lucide-react'
import { priceInclGst } from '@/lib/gst'

const DEFAULT_CATEGORIES = ['Starters', 'Mains', 'Desserts', 'Drinks', 'Sides']

/** Per-category options and extras to sync into the form when that category is selected */
export type CategoryCustomizationsMap = Record<string, { removeOptions: MenuItemCustomizationOption[]; extras: MenuItemCustomizationOption[] }>

interface MenuItemFormProps {
  initialData?: Partial<MenuItem>
  /** When provided, category dropdown uses these options plus "New category...". Otherwise uses default list. */
  categoryOptions?: string[]
  /** When provided, options and extras for each category are merged into the form when that category is selected. */
  categoryCustomizationsByCategory?: CategoryCustomizationsMap
  /** When false, hide delete (trash) buttons for remove options and extras. Used by POS so only Restaurant Dashboard can delete. */
  allowDeleteOptions?: boolean
  onSubmit: (data: Partial<MenuItem>) => void
  onCancel: () => void
}

function getRemoveOptionsAndExtrasFromCustomizations(customizations?: MenuItem['customizations']) {
  let removeOptions: MenuItemCustomizationOption[] = []
  let extras: MenuItemCustomizationOption[] = []
  if (customizations?.length) {
    for (const g of customizations) {
      if (g.type === 'remove') removeOptions = g.options.map((o) => ({ id: o.id, name: o.name, price: 0 }))
      if (g.type === 'extra') extras = g.options.map((o) => ({ id: o.id, name: o.name, price: o.price }))
    }
  }
  return { removeOptions, extras }
}

const NEW_CATEGORY_VALUE = '__new__'
const NO_CATEGORY_VALUE = '__none__'

export function MenuItemForm({ initialData, categoryOptions, categoryCustomizationsByCategory, allowDeleteOptions = true, onSubmit, onCancel }: MenuItemFormProps) {
  const { removeOptions: initRemove, extras: initExtras } = useMemo(
    () => getRemoveOptionsAndExtrasFromCustomizations(initialData?.customizations),
    [initialData?.customizations]
  )
  const options = useMemo(() => {
    const base = (categoryOptions && categoryOptions.length > 0)
      ? [...new Set(categoryOptions)]
      : DEFAULT_CATEGORIES
    const current = (initialData?.category && initialData.category !== NEW_CATEGORY_VALUE && initialData.category !== NO_CATEGORY_VALUE) ? initialData.category : null
    if (current && !base.includes(current)) return [...base, current]
    return base
  }, [categoryOptions, initialData?.category])
  const [formData, setFormData] = useState<Partial<MenuItem> & { newCategoryName?: string }>(
    initialData
      ? { ...initialData, newCategoryName: '' }
      : {
          name: '',
          description: '',
          price: 0,
          category: NO_CATEGORY_VALUE,
          image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
          isAvailable: true,
          newCategoryName: ''
        }
  )
  const [removeOptions, setRemoveOptions] = useState<MenuItemCustomizationOption[]>(initRemove)
  const [extras, setExtras] = useState<MenuItemCustomizationOption[]>(initExtras)
  const isNewCategory = formData.category === NEW_CATEGORY_VALUE

  const defaultSizes = useMemo((): { small: number; medium: number; large: number } => {
    const s = initialData?.sizes
    if (Array.isArray(s) && s.length >= 3) {
      const byName = (name: string) => (s as MenuItemSize[]).find((x) => x.name.toLowerCase() === name.toLowerCase())?.price ?? 0
      return { small: byName('Small'), medium: byName('Medium'), large: byName('Large') }
    }
    const p = Number(initialData?.price ?? 0)
    return { small: Math.max(0, p - 2), medium: p, large: p + 2 }
  }, [initialData?.sizes, initialData?.price])
  const [sizesEnabled, setSizesEnabled] = useState(Boolean(initialData?.sizes?.length))
  const [sizePrices, setSizePrices] = useState(defaultSizes)

  useEffect(() => {
    const { removeOptions: r, extras: e } = getRemoveOptionsAndExtrasFromCustomizations(initialData?.customizations)
    setRemoveOptions(r)
    setExtras(e)
  }, [initialData?.customizations])

  // Sync category-level options and extras into the form when this category has customizations
  useEffect(() => {
    const category = formData.category
    if (!categoryCustomizationsByCategory || !category || category === NEW_CATEGORY_VALUE || category === NO_CATEGORY_VALUE) return
    const catCustom = categoryCustomizationsByCategory[category]
    if (!catCustom?.removeOptions?.length && !catCustom?.extras?.length) return
    setRemoveOptions((prev) => {
      const names = new Set(prev.map((o) => (o.name ?? '').trim()))
      const toAdd = (catCustom.removeOptions || []).filter((o) => (o.name ?? '').trim() && !names.has((o.name ?? '').trim()))
      if (toAdd.length === 0) return prev
      return [...prev, ...toAdd]
    })
    setExtras((prev) => {
      const names = new Set(prev.map((o) => (o.name ?? '').trim()))
      const toAdd = (catCustom.extras || []).filter((o) => (o.name ?? '').trim() && !names.has((o.name ?? '').trim()))
      if (toAdd.length === 0) return prev
      return [...prev, ...toAdd]
    })
  }, [formData.category, categoryCustomizationsByCategory])
  useEffect(() => {
    setSizePrices(defaultSizes)
    setSizesEnabled(Boolean(initialData?.sizes?.length))
  }, [initialData?.sizes, initialData?.price, defaultSizes])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const category = isNewCategory ? (formData.newCategoryName ?? '').trim() || 'Other' : (formData.category ?? 'Other')
    const customizations: MenuItem['customizations'] = []
    if (removeOptions.filter((o) => (o.name ?? '').trim()).length > 0) {
      customizations.push({
        id: 'remove_options',
        name: 'Options',
        type: 'remove',
        options: removeOptions.filter((o) => (o.name ?? '').trim()).map((o, i) => ({ id: o.id || `rem_${i}`, name: o.name.trim(), price: 0 }))
      })
    }
    if (extras.filter((o) => (o.name ?? '').trim()).length > 0) {
      customizations.push({
        id: 'extras',
        name: 'Extras',
        type: 'extra',
        options: extras.filter((o) => (o.name ?? '').trim()).map((o, i) => ({ id: o.id || `ext_${i}`, name: o.name.trim(), price: Number(o.price) || 0 }))
      })
    }
    const sizes: MenuItemSize[] | undefined = sizesEnabled
      ? [
          { name: 'Small', price: Number(sizePrices.small) || 0 },
          { name: 'Medium', price: Number(sizePrices.medium) || 0 },
          { name: 'Large', price: Number(sizePrices.large) || 0 }
        ]
      : undefined
    const effectivePrice = sizesEnabled ? Number(sizePrices.medium) || 0 : formData.price ?? 0
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- newCategoryName intentionally omitted from submit
    const { newCategoryName: _n, ...rest } = formData
    onSubmit({ ...rest, price: effectivePrice, category, customizations: customizations.length > 0 ? customizations : undefined, sizes })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Item Name"
        value={formData.name}
        onChange={(e) =>
          setFormData({
            ...formData,
            name: e.target.value
          })
        }
        required
      />
      <Textarea
        label="Description"
        value={formData.description}
        onChange={(e) =>
          setFormData({
            ...formData,
            description: e.target.value
          })
        }
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Price"
          type="number"
          step="0.01"
          min="0"
          value={formData.price}
          onChange={(e) =>
            setFormData({
              ...formData,
              price: parseFloat(e.target.value)
            })
          }
          required
        />
        <p className="col-span-2 text-xs text-gray-500 -mt-2">Customer price incl. GST: A${priceInclGst(Number(formData.price) || 0).toFixed(2)}</p>
        <Select
          label="Category"
          value={formData.category ?? NO_CATEGORY_VALUE}
          onChange={(e) =>
            setFormData({
              ...formData,
              category: e.target.value
            })
          }
          options={[
            { value: NO_CATEGORY_VALUE, label: 'No category' },
            ...options.map((c) => ({ value: c, label: c })),
            { value: NEW_CATEGORY_VALUE, label: '➕ New category...' }
          ]}
        />
        {isNewCategory && (
          <Input
            label="New category name"
            value={formData.newCategoryName ?? ''}
            onChange={(e) => setFormData({ ...formData, newCategoryName: e.target.value })}
            placeholder="Enter new category name"
          />
        )}
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={sizesEnabled}
            onChange={(e) => setSizesEnabled(e.target.checked)}
            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
          />
          <span className="text-sm font-medium text-gray-700">Offer sizes (Small, Medium, Large) with separate prices</span>
        </label>
        {sizesEnabled && (
          <div className="grid grid-cols-3 gap-3 mt-2">
            <Input
              label="Small (A$)"
              type="number"
              step="0.01"
              min="0"
              value={sizePrices.small}
              onChange={(e) => setSizePrices((p) => ({ ...p, small: parseFloat(e.target.value) || 0 }))}
            />
            <Input
              label="Medium (A$)"
              type="number"
              step="0.01"
              min="0"
              value={sizePrices.medium}
              onChange={(e) => setSizePrices((p) => ({ ...p, medium: parseFloat(e.target.value) || 0 }))}
            />
            <Input
              label="Large (A$)"
              type="number"
              step="0.01"
              min="0"
              value={sizePrices.large}
              onChange={(e) => setSizePrices((p) => ({ ...p, large: parseFloat(e.target.value) || 0 }))}
            />
            <p className="col-span-3 text-xs text-gray-500">
              Customer prices incl. GST: Small A${priceInclGst(sizePrices.small).toFixed(2)} · Medium A${priceInclGst(sizePrices.medium).toFixed(2)} · Large A${priceInclGst(sizePrices.large).toFixed(2)}
            </p>
          </div>
        )}
      </div>

      <Input
        label="Image URL"
        value={formData.image}
        onChange={(e) =>
          setFormData({
            ...formData,
            image: e.target.value
          })
        }
        placeholder="https://..."
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
        <p className="text-xs text-gray-500 mb-2">Options customers can select (e.g. No onion, No tomato). No extra charge. Add or delete as needed.</p>
        {removeOptions.map((opt, idx) => (
          <div key={opt.id || idx} className="flex gap-2 mb-2">
            <Input
              value={opt.name}
              onChange={(e) => {
                const list = [...removeOptions]
                list[idx] = { ...list[idx], name: e.target.value }
                setRemoveOptions(list)
              }}
              placeholder="e.g. No onion"
              className="flex-1"
            />
            {allowDeleteOptions && (
              <button
                type="button"
                onClick={() => setRemoveOptions(removeOptions.filter((_, i) => i !== idx))}
                className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                aria-label="Remove option"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {allowDeleteOptions && (
          <button
            type="button"
            onClick={() => setRemoveOptions([...removeOptions, { id: `rem_${Date.now()}`, name: '', price: 0 }])}
            className="text-sm text-orange-600 font-medium hover:underline"
          >
            + Add option
          </button>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Extras</label>
        <p className="text-xs text-gray-500 mb-2">Add-ons with optional price (e.g. Extra cheese A$2).</p>
        {extras.map((opt, idx) => (
          <div key={opt.id || idx} className="flex gap-2 mb-2 items-center">
            <Input
              value={opt.name}
              onChange={(e) => {
                const list = [...extras]
                list[idx] = { ...list[idx], name: e.target.value }
                setExtras(list)
              }}
              placeholder="e.g. Extra cheese"
              className="flex-1"
            />
            <Input
              type="number"
              step="0.01"
              min={0}
              value={String(opt.price ?? 0)}
              onChange={(e) => {
                const list = [...extras]
                list[idx] = { ...list[idx], price: parseFloat(e.target.value) || 0 }
                setExtras(list)
              }}
              className="w-20"
            />
            <span className="text-xs text-gray-500 w-6">A$</span>
            <span className="text-xs text-gray-500 w-24">incl GST A${priceInclGst(Number(opt.price) || 0).toFixed(2)}</span>
            {allowDeleteOptions && (
              <button
                type="button"
                onClick={() => setExtras(extras.filter((_, i) => i !== idx))}
                className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                aria-label="Remove extra"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setExtras([...extras, { id: `ext_${Date.now()}`, name: '', price: 0 }])}
          className="text-sm text-orange-600 font-medium hover:underline"
        >
          + Add extra
        </button>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initialData ? 'Update Item' : 'Create Item'}</Button>
      </div>
    </form>
  )
}

