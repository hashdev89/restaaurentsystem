'use client'

import { useState, useMemo, useEffect } from 'react'
import { MenuItem, MenuItemCustomizationOption } from '@/types'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Textarea } from './ui/Textarea'
import { Select } from './ui/Select'
import { Trash2 } from 'lucide-react'

const DEFAULT_CATEGORIES = ['Starters', 'Mains', 'Desserts', 'Drinks', 'Sides']

interface MenuItemFormProps {
  initialData?: Partial<MenuItem>
  /** When provided, category dropdown uses these options plus "New category...". Otherwise uses default list. */
  categoryOptions?: string[]
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

export function MenuItemForm({ initialData, categoryOptions, onSubmit, onCancel }: MenuItemFormProps) {
  const { removeOptions: initRemove, extras: initExtras } = useMemo(
    () => getRemoveOptionsAndExtrasFromCustomizations(initialData?.customizations),
    [initialData?.customizations]
  )
  const options = useMemo(() => {
    const base = (categoryOptions && categoryOptions.length > 0)
      ? [...new Set(categoryOptions)]
      : DEFAULT_CATEGORIES
    const current = (initialData?.category && initialData.category !== NEW_CATEGORY_VALUE) ? initialData.category : null
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
          category: 'Mains',
          image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
          isAvailable: true,
          newCategoryName: ''
        }
  )
  const [removeOptions, setRemoveOptions] = useState<MenuItemCustomizationOption[]>(initRemove)
  const [extras, setExtras] = useState<MenuItemCustomizationOption[]>(initExtras)
  const isNewCategory = formData.category === NEW_CATEGORY_VALUE

  useEffect(() => {
    const { removeOptions: r, extras: e } = getRemoveOptionsAndExtrasFromCustomizations(initialData?.customizations)
    setRemoveOptions(r)
    setExtras(e)
  }, [initialData?.customizations])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const category = isNewCategory ? (formData.newCategoryName ?? '').trim() || 'Other' : (formData.category ?? 'Other')
    const customizations: MenuItem['customizations'] = []
    if (removeOptions.filter((o) => (o.name ?? '').trim()).length > 0) {
      customizations.push({
        id: 'remove_options',
        name: 'Remove options',
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
    const { newCategoryName: _n, ...rest } = formData
    onSubmit({ ...rest, category, customizations: customizations.length > 0 ? customizations : undefined })
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
        <Select
          label="Category"
          value={formData.category ?? (options[0] || 'Mains')}
          onChange={(e) =>
            setFormData({
              ...formData,
              category: e.target.value
            })
          }
          options={[
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
        <label className="block text-sm font-medium text-gray-700 mb-2">Remove options</label>
        <p className="text-xs text-gray-500 mb-2">Options customers can select to remove (e.g. No onion). No extra charge.</p>
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
            <button
              type="button"
              onClick={() => setRemoveOptions(removeOptions.filter((_, i) => i !== idx))}
              className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
              aria-label="Remove option"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRemoveOptions([...removeOptions, { id: `rem_${Date.now()}`, name: '', price: 0 }])}
          className="text-sm text-orange-600 font-medium hover:underline"
        >
          + Add remove option
        </button>
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
            <button
              type="button"
              onClick={() => setExtras(extras.filter((_, i) => i !== idx))}
              className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
              aria-label="Remove extra"
            >
              <Trash2 className="w-4 h-4" />
            </button>
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

