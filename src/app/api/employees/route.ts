/**
 * GET  /api/employees  — list all employees (admin only)
 * POST /api/employees  — create a new employee (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase-auth-helper'
import { generateRandomPassword } from '@/lib/auth-utils'
import { supabaseServer } from '@/lib/supabase-server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    await requireAdmin(req)

    const { data: employees, error } = await supabaseServer
      .from('users')
      .select('id, name, email, role, category, monthly_salary, joining_date, is_active, created_at')
      .eq('role', 'employee')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching employees:', error)
      return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
    }

    return NextResponse.json({ employees: employees || [] })
  } catch (error: any) {
    const status = error.message?.includes('Forbidden') ? 403 : 401
    return NextResponse.json({ error: error.message || 'Unauthorized' }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication
    const user = await requireAdmin(req)

    const body = await req.json()
    const { name, email, category, monthlySalary, joiningDate } = body

    if (!name || !email || !monthlySalary || !joiningDate) {
      return NextResponse.json({ error: 'name, email, monthlySalary, and joiningDate are required' }, { status: 400 })
    }

    // Check for duplicate email
    const { data: existing } = await supabaseServer
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'An employee with this email already exists' }, { status: 409 })
    }

    const tempPassword = generateRandomPassword()

    const { data: authData, error: authError } = await supabaseServer.auth.admin.createUser({
      email: email.toLowerCase(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name },
    })

    if (authError || !authData.user) {
      console.error('Error creating employee auth user:', authError)
      return NextResponse.json({ error: 'Failed to create employee auth account' }, { status: 500 })
    }

    const { data: employee, error } = await supabaseServer
      .from('users')
      .insert({
        id:             authData.user.id,
        name,
        email:          email.toLowerCase(),
        role:           'employee',
        category:       category || 'regular',
        monthly_salary: monthlySalary,
        joining_date:   joiningDate,
        password_hash:  tempPassword, // Store plain text password
        is_active:      true,
      })
      .select('id, name, email, role, category, monthly_salary, joining_date')
      .single()

    if (error) {
      console.error('Error creating employee:', error)
      await supabaseServer.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: 'Failed to create employee', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, employee, tempPassword }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
