/**
 * POST /api/short-leave/approve
 * Admin approves or rejects a short leave request.
 * On approval, updates the attendance record for that day.
 *
 * Uses service-role Supabase client (bypasses RLS).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdmin } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req)
    const userId = user.userId

    const { shortLeaveId, status } = await req.json()

    if (!shortLeaveId || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'shortLeaveId and status (approved|rejected) required' },
        { status: 400 }
      )
    }

    // Get the short leave record
    const { data: sl, error: fetchErr } = await supabaseServer
      .from('short_leaves')
      .select('*')
      .eq('id', shortLeaveId)
      .maybeSingle()

    if (fetchErr || !sl) {
      return NextResponse.json({ error: 'Short leave not found' }, { status: 404 })
    }

    // Update short leave status
    const { data: updated, error: updateErr } = await supabaseServer
      .from('short_leaves')
      .update({
        status,
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', shortLeaveId)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to update short leave' }, { status: 500 })
    }

    // If approved, update the attendance record for that day
    if (status === 'approved') {
      // Calculate attendance value based on monthly count
      // First 2 short leaves = 1.0, beyond that = 0.75
      const monthPrefix = sl.date.substring(0, 7) // YYYY-MM
      
      const { count: monthlyCount } = await supabaseServer
        .from('short_leaves')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', sl.employee_id)
        .gte('date', `${monthPrefix}-01`)
        .lte('date', `${monthPrefix}-31`)
        .eq('status', 'approved')

      const usedCount = (monthlyCount ?? 0)
      const attendanceValue = usedCount <= 2 ? 1.0 : 0.75

      const { data: att } = await supabaseServer
        .from('attendance')
        .select('id, status, attendance_value')
        .eq('employee_id', sl.employee_id)
        .eq('date', sl.date)
        .maybeSingle()

      if (att) {
        const newStatus = attendanceValue >= 1 ? 'approved_short_leave' : 'half_day'
        await supabaseServer
          .from('attendance')
          .update({ attendance_value: attendanceValue, status: newStatus })
          .eq('id', att.id)
      }
    }

    return NextResponse.json({ success: true, shortLeave: updated })
  } catch (err) {
    console.error('POST /api/short-leave/approve error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}