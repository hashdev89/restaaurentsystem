'use client'

import { useState } from 'react'
import { MenuItem } from '@/types'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Textarea } from './ui/Textarea'
import { Select } from './ui/Select'

interface MenuItemFormProps {
  initialData?: Partial<MenuItem>
  onSubmit: (data: Partial<MenuItem>) => void
  onCancel: () => void
}

export function MenuItemForm({ initialData, onSubmit, onCancel }: MenuItemFormProps) {
  const [formData, setFormData] = useState<Partial<MenuItem>>(
    initialData || {
      name: '',
      description: '',
      price: 0,
      category: 'Mains',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
      isAvailable: true
    }
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
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
          value={formData.category}
          onChange={(e) =>
            setFormData({
              ...formData,
              category: e.target.value
            })
          }
          options={[
            { value: 'Starters', label: 'Starters' },
            { value: 'Mains', label: 'Mains' },
            { value: 'Desserts', label: 'Desserts' },
            { value: 'Drinks', label: 'Drinks' },
            { value: 'Sides', label: 'Sides' }
          ]}
        />
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

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{initialData ? 'Update Item' : 'Create Item'}</Button>
      </div>
    </form>
  )
}

