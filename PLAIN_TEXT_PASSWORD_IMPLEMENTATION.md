# Plain Text Password Implementation

## Overview

This application now uses **plain text password storage** with **Supabase Auth** for session management. This approach eliminates password hashing complications while maintaining secure session handling.

## Architecture

### Password Storage
- **Database Column**: `users.password_hash` stores passwords as plain text
- **Supabase Auth**: Manages its own password hashing internally (we don't control this)
- **Sync Strategy**: Both systems are kept in sync during user creation and password changes

### Authentication Flow

#### 1. User Login (`/api/auth/login`)
```
1. User submits email + password
2. Query users table for email
3. Compare submitted password with users.password_hash (plain text comparison)
4. If match, call supabase.auth.signInWithPassword() to create session
5. Return session token to client
```

#### 2. User Creation (`/api/auth/create-user`)
```
1. Admin creates user with details
2. Generate random plain text password
3. Create user in Supabase Auth with the password
4. Store same password in users.password_hash (plain text)
5. Return temporary password to admin
```

#### 3. Password Change (`/api/auth/change-password`)
```
1. User submits old + new password
2. Verify old password against users.password_hash (plain text comparison)
3. Update Supabase Auth password
4. Update users.password_hash with new plain text password
5. Both systems stay in sync
```

## Key Benefits

✅ **No Hashing Complications**: Direct string comparison, no bcrypt/hash issues
✅ **Supabase Session Management**: Secure JWT tokens handled by Supabase
✅ **No Custom Authentication**: Zero custom JWT logic
✅ **Simple Password Recovery**: Plain text passwords can be easily reset by admin
✅ **Consistent Behavior**: Password verification always works the same way

## Security Considerations

⚠️ **Database Access**: Anyone with database access can see passwords
⚠️ **Backup Security**: Database backups contain plain text passwords
⚠️ **Audit Logs**: Password changes are visible in plain text

### Mitigation Strategies
1. Restrict database access to authorized personnel only
2. Use Supabase Row Level Security (RLS) policies
3. Encrypt database backups
4. Use strong passwords for database admin accounts
5. Monitor database access logs

## Implementation Files

### Updated Files
- `src/app/api/auth/login/route.ts` - Plain text password verification
- `src/app/api/auth/change-password/route.ts` - Syncs both systems
- `src/app/api/auth/create-user/route.ts` - Stores plain text password
- `UPDATE_DATABASE_FOR_SUPABASE_AUTH.sql` - Database setup

### No Changes Needed
- All other API routes use `requireAuth()` and `requireAdmin()` helpers
- Session management handled entirely by Supabase Auth
- No custom JWT token generation or verification

## Database Setup

Run the SQL in `UPDATE_DATABASE_FOR_SUPABASE_AUTH.sql` to:
1. Keep `password_hash` column for plain text storage
2. Create admin user with plain text password
3. Set up user deletion triggers

## Testing

### Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123"}'
```

### Test User Creation
```bash
curl -X POST http://localhost:3000/api/auth/create-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "email":"employee@company.com",
    "name":"John Doe",
    "category":"regular",
    "monthly_salary":50000
  }'
```

### Test Password Change
```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -d '{
    "oldPassword":"current_password",
    "newPassword":"new_password"
  }'
```

## Default Admin Credentials

After running the database setup SQL:
- **Email**: admin@company.com
- **Password**: admin123

⚠️ **Change this password immediately in production!**

## Troubleshooting

### Login Fails
1. Check if user exists in `users` table
2. Verify `password_hash` column contains the correct plain text password
3. Check if `is_active` is true
4. Verify Supabase Auth user exists with same email

### Password Mismatch
1. Ensure `users.password_hash` matches the actual password
2. Check for extra spaces or case sensitivity
3. Verify password was synced during creation/change

### Session Issues
1. Check Supabase Auth configuration in `.env.local`
2. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Check browser console for session errors
4. Ensure cookies are enabled

## Migration from Hashed Passwords

If you previously used hashed passwords:

1. **Option A - Reset All Passwords**
   - Run SQL to set all `password_hash` to a default value
   - Have users reset their passwords
   - Admin manually updates passwords

2. **Option B - Manual Update**
   - For each user, admin creates new plain text password
   - Update both Supabase Auth and `users.password_hash`
   - Notify users of new passwords

## Future Considerations

If you need to switch back to hashed passwords:
1. Update login route to use bcrypt comparison
2. Update create-user to hash passwords
3. Update change-password to hash new passwords
4. Run migration script to hash existing plain text passwords

## Support

For issues or questions:
1. Check Supabase Auth logs in Supabase Dashboard
2. Check application logs for error messages
3. Verify database schema matches expected structure
4. Test with curl commands to isolate frontend vs backend issues
