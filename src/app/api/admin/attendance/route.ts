/**
 * GET /api/admin/attendance
 * Returns today's attendance for ALL employees (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdmin } from '@/lib/supabase-auth-helper'
import { supabaseServer as supabase } from '@/lib/supabase-server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

// IST = UTC+5:30
function todayIST(): string {
  const now = new Date()
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
  const y = ist.getUTCFullYear()
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0')
  const d = String(ist.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    await requireAdmin(req)

    const today = todayIST()
    
    console.log('[Admin Attendance] Querying for date:', today)

    // Direct query without RPC
    const { data: records, error } = await supabase
      .from('attendance')
      .select(`
        id,
        employee_id,
        date,
        check_in,
        check_out,
        status,
        selfie_url,
        attendance_value,
        is_late,
        users (
          name,
          email
        )
      `)
      .eq('date', today)
      .order('check_in', { ascending: false })

    console.log('[Admin Attendance] Query result:', {
      count: records?.length || 0,
      error: error?.message,
      records: records
    })

    if (error) {
      console.error('[Admin Attendance] Query error:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch attendance',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({ records: records || [] })
  } catch (error: any) {
    console.error('[Admin Attendance] Exception:', error)
    const status = error.message?.includes('Forbidden') ? 403 : error.message?.includes('Unauthorized') ? 401 : 500
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status })
  }
}
