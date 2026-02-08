'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { MenuItem as MenuItemType, SelectedExtra } from '@/types'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
import { useCart } from './providers/CartProvider'
import { useNotification } from './providers/NotificationProvider'
import { priceInclGst } from '@/lib/gst'

const SPICE_LEVELS = ['None', 'Mild', 'Medium', 'Hot', 'Extra Hot'] as const

function sizeToShortLabel(name: string): string {
  const n = name.toLowerCase()
  if (n === 'small') return 'sm'
  if (n === 'medium') return 'md'
  if (n === 'large') return 'lg'
  return name
}

interface MenuItemProps {
  item: MenuItemType
}

export function MenuItem({ item }: MenuItemProps) {
  const { addItem } = useCart()
  const { success } = useNotification()
  const hasSizes = item.sizes && item.sizes.length > 0
  const hasCustomizations = item.customizations && item.customizations.length > 0
  const [selectedSize, setSelectedSize] = useState<typeof item.sizes[number] | null>(
    hasSizes && item.sizes!.length > 0 ? item.sizes![0] : null
  )
  const [showCustomizeModal, setShowCustomizeModal] = useState(false)
  // Modal state: removes = option ids, extras = option ids, spice, request
  const [selectedRemoves, setSelectedRemoves] = useState<string[]>([])
  const [selectedExtras, setSelectedExtras] = useState<string[]>([])
  const [spiceLevel, setSpiceLevel] = useState<string>('')
  const [specialRequest, setSpecialRequest] = useState('')

  const basePrice = hasSizes && selectedSize ? selectedSize.price : item.price
  const removeGroup = hasCustomizations ? item.customizations!.find((g) => g.type === 'remove') : null
  const extraGroup = hasCustomizations ? item.customizations!.find((g) => g.type === 'extra') : null
  const extrasTotal = (extraGroup?.options ?? [])
    .filter((o) => selectedExtras.includes(o.id))
    .reduce((sum, o) => sum + (o.price ?? 0), 0)
  const displayPrice = priceInclGst(basePrice + extrasTotal)

  const openCustomizeModal = () => {
    setSelectedRemoves([])
    setSelectedExtras([])
    setSpiceLevel('')
    setSpecialRequest('')
    setShowCustomizeModal(true)
  }

  const handleAdd = (opts?: {
    selectedRemoves?: string[]
    selectedExtras?: SelectedExtra[]
    spiceLevel?: string
    specialRequest?: string
  }) => {
    if (hasSizes && selectedSize) {
      addItem(item, {
        selectedSize: selectedSize.name,
        sizePrice: selectedSize.price,
        ...(opts?.selectedRemoves?.length ? { selectedRemoves: opts.selectedRemoves } : {}),
        ...(opts?.selectedExtras?.length ? { selectedExtras: opts.selectedExtras } : {}),
        ...(opts?.spiceLevel ? { spiceLevel: opts.spiceLevel } : {}),
        ...(opts?.specialRequest ? { specialRequest: opts.specialRequest } : {})
      })
      const label = opts?.selectedRemoves?.length || opts?.selectedExtras?.length || opts?.spiceLevel || opts?.specialRequest
        ? `${item.name} (${selectedSize.name}) — customized`
        : `${item.name} (${selectedSize.name})`
      success('Added to cart', label, { duration: 3000 })
    } else if (opts?.selectedRemoves?.length || opts?.selectedExtras?.length || opts?.spiceLevel || opts?.specialRequest) {
      addItem(item, {
        ...(opts.selectedRemoves?.length ? { selectedRemoves: opts.selectedRemoves } : {}),
        ...(opts.selectedExtras?.length ? { selectedExtras: opts.selectedExtras } : {}),
        ...(opts.spiceLevel ? { spiceLevel: opts.spiceLevel } : {}),
        ...(opts.specialRequest ? { specialRequest: opts.specialRequest } : {})
      })
      success('Added to cart', `${item.name} — customized`, { duration: 3000 })
    } else {
      addItem(item)
      success('Added to cart', item.name, { duration: 3000 })
    }
  }

  const handleCustomizeSubmit = () => {
    const removeNames = (removeGroup?.options ?? [])
      .filter((o) => selectedRemoves.includes(o.id))
      .map((o) => o.name)
    const extras: SelectedExtra[] = (extraGroup?.options ?? [])
      .filter((o) => selectedExtras.includes(o.id))
      .map((o) => ({ id: o.id, name: o.name, price: o.price ?? 0 }))
    handleAdd({
      selectedRemoves: removeNames.length ? removeNames : undefined,
      selectedExtras: extras.length ? extras : undefined,
      spiceLevel: spiceLevel || undefined,
      specialRequest: specialRequest.trim() || undefined
    })
    setShowCustomizeModal(false)
  }

  const toggleRemove = (id: string) => {
    setSelectedRemoves((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }
  const toggleExtra = (id: string) => {
    setSelectedExtras((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const addButtonPrice = priceInclGst(basePrice)
  const addButtonLabel = `Add to Cart — A$${addButtonPrice.toFixed(2)}`

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="w-full sm:w-32 h-32 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
              {!hasSizes && (
                <span className="font-medium text-gray-900">
                  A${priceInclGst(item.price).toFixed(2)} <span className="text-xs font-normal text-gray-500">(incl GST)</span>
                </span>
              )}
            </div>
            {hasSizes && item.sizes && item.sizes.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                {item.sizes.map((s) => sizeToShortLabel(s.name)).join(' · ')}
              </p>
            )}
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
              {item.description}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => handleAdd()}
              disabled={!item.isAvailable || (hasSizes && !selectedSize)}
              className="min-w-[140px]"
            >
              <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
              {addButtonLabel}
            </Button>
            {hasCustomizations && (
              <Button
                size="sm"
                variant="secondary"
                onClick={openCustomizeModal}
                disabled={!item.isAvailable}
                className="min-w-[100px]"
              >
                Customize
              </Button>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showCustomizeModal}
        onClose={() => setShowCustomizeModal(false)}
        title={`Customize: ${item.name}`}
        closeOnOverlayClick={true}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          {hasSizes && item.sizes && item.sizes.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Size</p>
              <div className="flex flex-wrap gap-2">
                {item.sizes.map((size) => (
                  <label
                    key={size.name}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-colors text-sm font-medium ${
                      selectedSize?.name === size.name
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 bg-gray-50 hover:border-orange-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`modal-size-${item.id}`}
                      checked={selectedSize?.name === size.name}
                      onChange={() => setSelectedSize(size)}
                      className="sr-only"
                    />
                    <span className="text-black font-medium">{size.name}</span>
                    <span className="text-black font-semibold">A${priceInclGst(size.price).toFixed(2)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {removeGroup && removeGroup.options.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{removeGroup.name}</p>
              <div className="flex flex-wrap gap-2">
                {removeGroup.options.map((opt) => (
                  <label
                    key={opt.id}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRemoves.includes(opt.id)}
                      onChange={() => toggleRemove(opt.id)}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm">{opt.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {extraGroup && extraGroup.options.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{extraGroup.name}</p>
              <div className="flex flex-wrap gap-2">
                {extraGroup.options.map((opt) => (
                  <label
                    key={opt.id}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100"
                  >
                    <input
                      type="checkbox"
                      checked={selectedExtras.includes(opt.id)}
                      onChange={() => toggleExtra(opt.id)}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm">{opt.name}</span>
                    {opt.price > 0 && (
                      <span className="text-xs font-medium text-gray-600">+A${priceInclGst(opt.price).toFixed(2)}</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Spice level</label>
            <select
              value={spiceLevel}
              onChange={(e) => setSpiceLevel(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">Select (optional)</option>
              {SPICE_LEVELS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Special request (optional)</label>
            <input
              type="text"
              value={specialRequest}
              onChange={(e) => setSpecialRequest(e.target.value)}
              placeholder="e.g. no ice, extra sauce"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleCustomizeSubmit} className="flex-1">
              Add to cart — A${displayPrice.toFixed(2)}
            </Button>
            <Button variant="secondary" onClick={() => setShowCustomizeModal(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

