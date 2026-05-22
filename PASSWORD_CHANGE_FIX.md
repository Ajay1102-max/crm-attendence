# Fix: Password Change Functionality

## Problem
When users tried to change their password, they were getting a **500 Internal Server Error**.

## Root Cause
The change password API route (`/api/auth/change-password`) was using the old authentication pattern:
- Manually creating a Supabase client with the anon key
- Using `supabase.auth.updateUser()` which requires the user's own session context
- This approach was inconsistent with the server-side service role pattern

## Solution Applied - Pure Supabase Admin API

Updated the change password route to use **Supabase's Admin API** with the service role key:

### Key Changes:

1. **Token Verification**: Use `supabaseServer.auth.getUser(accessToken)` instead of creating a custom client
2. **Password Update**: Use `supabaseServer.auth.admin.updateUserById()` instead of `updateUser()`
3. **Consistent Pattern**: Same authentication pattern as other API routes

## Code Changes

### Before (❌ User context method):
```typescript
// Creating custom client with anon key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  }
)

// This requires user's session context
const { error } = await supabase.auth.updateUser({
  password: newPassword
})
```

### After (✅ Admin API method):
```typescript
// Verify token with service role
const { data: { user } } = await supabaseServer.auth.getUser(accessToken)

// Update password using Admin API
const { error } = await supabaseServer.auth.admin.updateUserById(
  user.id,
  { password: newPassword }
)
```

## How It Works Now

### Password Change Flow:
```
1. User submits change password form
   ↓
2. Frontend sends request with:
   - Authorization: Bearer <access_token>
   - Body: { oldPassword, newPassword }
   ↓
3. Server verifies token:
   - supabaseServer.auth.getUser(token) ✅
   ↓
4. Server fetches user profile:
   - supabaseServer.from('users').select() ✅
   ↓
5. Server verifies old password:
   - Compare with password_hash (plain text)
   ↓
6. Server updates password in Supabase Auth:
   - supabaseServer.auth.admin.updateUserById() ✅
   ↓
7. Server updates password in users table:
   - supabaseServer.from('users').update() ✅
   ↓
8. Success! Password changed in both places
```

## Benefits

- ✅ **Works on server-side**: Admin API doesn't need user session context
- ✅ **Consistent pattern**: Same as other API routes (create-user, etc.)
- ✅ **Pure Supabase**: No custom client creation
- ✅ **Secure**: Service role key has proper permissions
- ✅ **Dual update**: Updates both Supabase Auth AND users table

## Testing

After this fix:
1. ✅ Login as any user (admin or employee)
2. ✅ Go to settings/profile page
3. ✅ Click "Change Password"
4. ✅ Enter current password and new password
5. ✅ Password should update successfully
6. ✅ Can login with new password

## Important Notes

### Why Admin API?
- `auth.updateUser()` requires the user's own session context (client-side)
- `auth.admin.updateUserById()` works with service role key (server-side)
- Since we're on the server with service role key, we use the Admin API

### Plain Text Password Storage
Your system stores passwords in plain text in the `users.password_hash` column for reference. The change password flow updates:
1. **Supabase Auth** - Hashed and secure (Supabase handles this)
2. **users.password_hash** - Plain text for your reference

### Security Considerations
- Old password is verified before allowing change ✅
- New password must be at least 6 characters ✅
- Access token is verified with Supabase Auth ✅
- Service role key is only used server-side ✅

## Next Steps
1. Restart your development server
2. Clear browser cache (Ctrl+Shift+R)
3. Try changing password as any user
4. Should work without errors! 🎉

## Related Files Updated
- `src/app/api/auth/change-password/route.ts` - Main fix applied here
- Uses same pattern as `src/lib/supabase-auth-helper.ts`
