import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const DEFAULT_SETTINGS = {
  businessName: 'EasyMenu',
  taxRate: 10,
  currency: 'AUD',
  timezone: 'Australia/Sydney',
  features: { booking: true, pos: true, kitchen: true },
  integrations: { square: true, supabase: true, mapbox: true },
}

function rowToSettings(row: {
  business_name: string
  tax_rate: number
  currency: string
  timezone: string
  features: unknown
  integrations: unknown
}) {
  return {
    businessName: row.business_name ?? DEFAULT_SETTINGS.businessName,
    taxRate: Number(row.tax_rate ?? DEFAULT_SETTINGS.taxRate),
    currency: row.currency ?? DEFAULT_SETTINGS.currency,
    timezone: row.timezone ?? DEFAULT_SETTINGS.timezone,
    features:
      typeof row.features === 'object' && row.features !== null
        ? {
            booking: (row.features as Record<string, unknown>).booking !== false,
            pos: (row.features as Record<string, unknown>).pos !== false,
            kitchen: (row.features as Record<string, unknown>).kitchen !== false,
          }
        : DEFAULT_SETTINGS.features,
    integrations:
      typeof row.integrations === 'object' && row.integrations !== null
        ? {
            square: (row.integrations as Record<string, unknown>).square !== false,
            supabase: (row.integrations as Record<string, unknown>).supabase !== false,
            mapbox: (row.integrations as Record<string, unknown>).mapbox !== false,
          }
        : DEFAULT_SETTINGS.integrations,
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('business_name, tax_rate, currency, timezone, features, integrations')
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    if (!data) {
      return NextResponse.json({ settings: DEFAULT_SETTINGS })
    }

    return NextResponse.json({ settings: rowToSettings(data) })
  } catch (err: unknown) {
    console.error('GET settings error:', err)
    const message =
      err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string'
        ? (err as { message: string }).message
        : err instanceof Error
          ? err.message
          : 'Failed to fetch settings'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      businessName,
      taxRate,
      currency,
      timezone,
      features,
      integrations,
    } = body

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (typeof businessName === 'string') updates.business_name = businessName.trim() || 'EasyMenu'
    if (typeof taxRate === 'number' || (typeof taxRate === 'string' && taxRate !== ''))
      updates.tax_rate = Number(taxRate) || 0
    if (typeof currency === 'string') updates.currency = currency.trim() || 'AUD'
    if (typeof timezone === 'string') updates.timezone = timezone.trim() || 'Australia/Sydney'
    if (features && typeof features === 'object')
      updates.features = {
        booking: features.booking !== false,
        pos: features.pos !== false,
        kitchen: features.kitchen !== false,
      }
    if (integrations && typeof integrations === 'object')
      updates.integrations = {
        square: integrations.square !== false,
        supabase: integrations.supabase !== false,
        mapbox: integrations.mapbox !== false,
      }

    const { data: existing } = await supabase
      .from('system_settings')
      .select('id')
      .limit(1)
      .single()

    if (existing?.id) {
      const { data: updated, error } = await supabase
        .from('system_settings')
        .update(updates)
        .eq('id', existing.id)
        .select('business_name, tax_rate, currency, timezone, features, integrations')
        .single()

      if (error) throw error
      return NextResponse.json({ settings: rowToSettings(updated) })
    }

    const { data: inserted, error } = await supabase
      .from('system_settings')
      .insert({
        business_name: updates.business_name ?? DEFAULT_SETTINGS.businessName,
        tax_rate: updates.tax_rate ?? DEFAULT_SETTINGS.taxRate,
        currency: updates.currency ?? DEFAULT_SETTINGS.currency,
        timezone: updates.timezone ?? DEFAULT_SETTINGS.timezone,
        features: updates.features ?? DEFAULT_SETTINGS.features,
        integrations: updates.integrations ?? DEFAULT_SETTINGS.integrations,
      })
      .select('business_name, tax_rate, currency, timezone, features, integrations')
      .single()

    if (error) throw error
    return NextResponse.json({ settings: rowToSettings(inserted) })
  } catch (err: unknown) {
    console.error('PATCH settings error:', err)
    const message =
      err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string'
        ? (err as { message: string }).message
        : err instanceof Error
          ? err.message
          : 'Failed to save settings'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
