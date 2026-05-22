/**
 * GET  /api/settings/office  — get active office location
 * POST /api/settings/office  — create or update office location (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdmin } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const { data: office, error } = await supabaseServer
      .from('office_locations')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching office:', error)
      return NextResponse.json({ office: null })
    }

    return NextResponse.json({ office: office || null })
  } catch (error) {
    console.error('GET /api/settings/office error:', error)
    return NextResponse.json({ office: null })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const userId = user.userId

    const { name, latitude, longitude, radiusMeters } = await req.json()

    if (!name || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'name, latitude, and longitude are required' }, { status: 400 })
    }

    console.log('[Settings] Saving office location:', { name, latitude, longitude, radiusMeters })

    // Step 1: Deactivate all existing office locations
    const { error: deactivateError } = await supabaseServer
      .from('office_locations')
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000') // Update all rows

    if (deactivateError) {
      console.error('[Settings] Error deactivating offices:', deactivateError)
    }

    // Step 2: Insert new office location (always create new)
    const { data: office, error } = await supabaseServer
      .from('office_locations')
      .insert({
        name,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius_meters: parseInt(radiusMeters) || 500,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('[Settings] Error creating office:', error)
      return NextResponse.json({ error: 'Failed to save office location', details: error.message }, { status: 500 })
    }

    console.log('[Settings] Office location saved successfully:', office)

    return NextResponse.json({ success: true, office })
  } catch (error: any) {
    console.error('[Settings] POST /api/settings/office error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
