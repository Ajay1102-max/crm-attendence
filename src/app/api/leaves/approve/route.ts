/**
 * POST /api/leaves/approve
 * Admin approves or rejects a leave request.
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

    const { leaveRequestId, status, remarks } = await req.json()

    if (!leaveRequestId || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'leaveRequestId and status (approved|rejected) required' }, { status: 400 })
    }

    const { data: leaveRequest, error } = await supabaseServer
      .from('leave_requests')
      .update({
        status,
        remarks:     remarks || null,
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', leaveRequestId)
      .select()
      .single()

    if (error) {
      console.error('Error updating leave request:', error)
      return NextResponse.json({ error: 'Failed to update leave request' }, { status: 500 })
    }

    return NextResponse.json({ success: true, leaveRequest })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
