/**
 * GET /api/admin/leaves
 * Returns ALL leave requests with employee info (admin only).
 * ?status=pending  — filter by status (optional)
 *
 * Uses service-role Supabase client (bypasses RLS).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdmin } from '@/lib/supabase-auth-helper'
import { supabaseServer } from '@/lib/supabase-server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    console.log('🏖️ [Admin Leaves] Fetching leave requests...')
    
    // Verify admin authentication
    await requireAdmin(req)

    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status')

    console.log('📋 [Admin Leaves] Status filter:', statusFilter || 'none')

    // Use explicit foreign key relationship: employee_id -> users(id)
    let query = supabaseServer
      .from('leave_requests')
      .select(`
        *,
        users!leave_requests_employee_id_fkey(name, email)
      `)
      .order('created_at', { ascending: false })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data: leaves, error } = await query

    if (error) {
      console.error('❌ [Admin Leaves] Error fetching leaves:', error)
      console.error('❌ [Admin Leaves] Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return NextResponse.json({ 
        error: 'Failed to fetch leaves', 
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code 
      }, { status: 500 })
    }

    console.log('✅ [Admin Leaves] Found leaves:', leaves?.length || 0)

    return NextResponse.json({ leaves: leaves || [] })
  } catch (error: any) {
    console.error('❌ [Admin Leaves] Exception:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message,
      details: error.toString()
    }, { status: 500 })
  }
}
