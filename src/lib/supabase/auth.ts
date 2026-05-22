/**
 * Authentication Service
 * Uses Supabase Auth for authentication and session management
 */

import { supabase } from './client'

/**
 * Sign in with email and password using Supabase Auth
 */
export async function signIn(email: string, password: string) {
  try {
    console.log('🔐 Sign in attempt:', email)
    
    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password: password,
    })

    if (authError || !authData.user || !authData.session) {
      console.error('❌ Auth error:', authError?.message)
      return { success: false, error: authError?.message || 'Invalid email or password' }
    }

    console.log('✅ Auth successful, user ID:', authData.user.id)

    // Get user profile from users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      console.error('❌ Profile error:', profileError)
      return { success: false, error: 'User profile not found' }
    }

    if (!profile.is_active) {
      console.log('❌ User inactive')
      await supabase.auth.signOut()
      return { success: false, error: 'User account is inactive' }
    }

    console.log('✅ Login successful:', profile.email, 'role:', profile.role)

    return {
      success: true,
      user: authData.user,
      profile: profile,
      session: authData.session,
    }
  } catch (error: any) {
    console.error('💥 Error signing in:', error)
    return { success: false, error: error.message || 'Sign in failed' }
  }
}

/**
 * Sign out using Supabase Auth
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Sign out error:', error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (error: any) {
    console.error('Sign out error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get current session from Supabase Auth
 */
export async function getSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Get session error:', error)
      return { success: false, error: error.message }
    }

    if (!session) {
      return { success: false, error: 'No session found' }
    }

    return { success: true, session }
  } catch (error: any) {
    console.error('Get session error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get current user with profile
 */
export async function getCurrentUser() {
  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return { success: false, error: 'No user found' }
    }

    // Get user profile from database
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (profileError || !profile) {
      console.error('Error getting profile:', profileError)
      return { success: false, error: 'User profile not found' }
    }

    return {
      success: true,
      user: session.user,
      profile: profile,
      session: session,
    }
  } catch (error: any) {
    console.error('Get current user error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event)
    callback(event, session)
  })
  
  return {
    data: {
      subscription
    }
  }
}

/**
 * Change password
 */
export async function changePassword(newPassword: string) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      console.error('Change password error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Change password error:', error)
    return { success: false, error: error.message }
  }
}
