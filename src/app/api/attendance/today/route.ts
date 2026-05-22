/**
 * GET /api/attendance/today
 * Returns the current employee's attendance record for today (IST date).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdmin } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

function todayIST(): string {
  const ist = new Date(new Date().getTime() + 5.5 * 60 * 60 * 1000)
  const y = ist.getUTCFullYear()
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0')
  const d = String(ist.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const userId = user.userId

    const today = todayIST()
    
    console.log('[Attendance Today] ===== START =====')
    console.log('[Attendance Today] Employee ID:', userId)
    console.log('[Attendance Today] Today date:', today)

    // Direct query - simple and reliable
    const { data: attendance, error } = await supabaseServer
      .from('attendance')
      .select('*')
      .eq('employee_id', userId)
      .eq('date', today)
      .maybeSingle()

    console.log('[Attendance Today] Query result:', {
      found: !!attendance,
      error: error?.message,
      attendance: attendance
    })
    console.log('[Attendance Today] ===== END =====')

    if (error) {
      console.error('[Attendance Today] Error:', error)
      return NextResponse.json({ attendance: null, error: error.message })
    }

    return NextResponse.json({ attendance: attendance || null })
  } catch (error: any) {
    console.error('[Attendance Today] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
