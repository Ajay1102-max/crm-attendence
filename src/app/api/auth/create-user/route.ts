/**
 * POST /api/auth/create-user
 * Admin endpoint to create new users using Supabase Auth with plain text passwords
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/supabase-auth-helper'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Generate random password
 */
function generateRandomPassword(length: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)

    const body = await req.json()
    const { email, name, category, monthly_salary, monthlySalary, joining_date, joiningDate } = body

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 })
    }

    // Check if user already exists in users table
    const { data: existingUser } = await supabaseServer
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 })
    }

    // Generate temporary password (plain text)
    const tempPassword = generateRandomPassword()

    // Create user in Supabase Auth with plain password
    const { data: authData, error: authError } = await supabaseServer.auth.admin.createUser({
      email: email.toLowerCase(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name: name,
        plain_password: tempPassword // Store for reference
      },
    })

    if (authError || !authData.user) {
      console.error('Create auth user error:', authError)
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 })
    }

    console.log('✅ Auth user created:', authData.user.id)

    // Create user profile in users table with plain password
    const { data: newUser, error: createError } = await supabaseServer
      .from('users')
      .insert({
        id: authData.user.id,
        email: email.toLowerCase(),
        name,
        role: 'employee',
        category: category || 'regular',
        monthly_salary: monthly_salary || monthlySalary || 0,
        joining_date: joining_date || joiningDate || new Date().toISOString().split('T')[0],
        password_hash: tempPassword, // Store as plain text
        is_active: true,
      })
      .select()
      .single()

    if (createError) {
      console.error('Create user profile error:', createError)
      // Rollback: delete auth user
      await supabaseServer.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
    }

    console.log('✅ User profile created:', newUser.id)

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        category: newUser.category,
      },
      tempPassword,
      message: 'User created successfully. Share the temporary password with the employee.',
    })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
