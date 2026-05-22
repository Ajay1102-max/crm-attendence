/**
 * GET  /api/leaves/apply  — fetch employee's own leave history
 * POST /api/leaves/apply  — employee applies for leave
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
    const user = await requireAuth(req)
    const userId = user.userId

    const { data: leaves, error } = await supabaseServer
      .from('leave_requests')
      .select('*')
      .eq('employee_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching leaves:', error)
      return NextResponse.json({ error: 'Failed to fetch leaves' }, { status: 500 })
    }

    return NextResponse.json({ leaves: leaves || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('🏖️ [Leave Apply] Starting leave application...')
    
    const user = await requireAuth(req)
    const userId = user.userId
    
    console.log('✅ [Leave Apply] User authenticated:', userId)

    const body = await req.json()
    console.log('📝 [Leave Apply] Request body:', body)
    
    // Accept both 'leaveType' (from frontend form) and 'type' (legacy)
    const { startDate, endDate, reason, leaveType, type } = body
    const resolvedType = leaveType || type

    console.log('📋 [Leave Apply] Resolved type:', resolvedType)

    if (!startDate || !endDate || !resolvedType) {
      console.log('❌ [Leave Apply] Missing required fields')
      return NextResponse.json({ error: 'startDate, endDate, and leaveType are required' }, { status: 400 })
    }

    if (new Date(startDate) > new Date(endDate)) {
      console.log('❌ [Leave Apply] Invalid date range')
      return NextResponse.json({ error: 'Start date cannot be after end date' }, { status: 400 })
    }

    // Calculate total days (simple count, excluding weekends is handled by backend engine)
    const start = new Date(startDate)
    const end   = new Date(endDate)
    const diffMs = end.getTime() - start.getTime()
    const totalDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1

    console.log('📅 [Leave Apply] Total days:', totalDays)

    const insertData = {
      employee_id: userId,
      start_date:  startDate,
      end_date:    endDate,
      total_days:  totalDays,
      reason:      reason || '',
      type:        resolvedType,
      status:      'pending',
    }

    console.log('💾 [Leave Apply] Inserting data:', insertData)

    const { data: leaveRequest, error } = await supabaseServer
      .from('leave_requests')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ [Leave Apply] Database error:', error)
      console.error('❌ [Leave Apply] Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return NextResponse.json({ 
        error: 'Failed to apply for leave', 
        details: error.message,
        hint: error.hint 
      }, { status: 500 })
    }

    console.log('✅ [Leave Apply] Leave request created:', leaveRequest.id)

    return NextResponse.json(
      { success: true, message: 'Leave request submitted successfully', leaveRequest },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('❌ [Leave Apply] Exception:', error)
    const status = error.message?.includes('Forbidden') ? 403 : error.message?.includes('Unauthorized') ? 401 : 500
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      details: error.toString()
    }, { status })
  }
}
