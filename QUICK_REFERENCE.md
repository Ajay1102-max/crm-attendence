# 🚀 Quick Reference Card

## Default Admin Credentials
```
Email: admin@company.com
Password: admin123
```
⚠️ **Change immediately after first login!**

---

## Start Development Server
```bash
npm run dev
```
Then open: http://localhost:3000/login

---

## Database Setup (First Time Only)
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy contents of `UPDATE_DATABASE_FOR_SUPABASE_AUTH.sql`
4. Paste and click "Run"

---

## Environment Variables Required
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

---

## Authentication System

### How Login Works
1. User enters email + password
2. System checks `users.password_hash` (plain text comparison)
3. If match → Supabase Auth creates session
4. Session token returned to client
5. Token used for all API calls

### Password Storage
- **Database**: `users.password_hash` stores plain text
- **Supabase Auth**: Manages sessions (hashes internally)
- **Both systems**: Stay in sync

---

## Key Files

### Authentication
- `src/app/api/auth/login/route.ts` - Login endpoint
- `src/app/api/auth/create-user/route.ts` - User creation
- `src/app/api/auth/change-password/route.ts` - Password change

### Helpers
- `src/lib/supabase-auth-helper.ts` - `requireAuth()` & `requireAdmin()`
- `src/lib/supabase/auth.ts` - Client auth functions

### Documentation
- `README.md` - Main documentation
- `PLAIN_TEXT_PASSWORD_IMPLEMENTATION.md` - Auth details
- `IMPLEMENTATION_SUMMARY.md` - Complete overview
- `SETUP_COMPLETE.md` - Setup instructions

---

## Common Commands

### Development
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm start            # Start production server
```

### Testing Login (curl)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123"}'
```

---

## Troubleshooting

### Cannot Login
1. Check browser console for errors
2. Verify user exists in `users` table
3. Check `password_hash` column value
4. Verify `is_active` is `true`

### Build Errors
```bash
npm run build
# Check error messages and fix reported files
```

### Session Expires
1. Clear browser cookies and localStorage
2. Check Supabase Auth configuration
3. Verify environment variables

---

## User Management

### Create New Employee
1. Login as admin
2. Go to Users → Create User
3. Fill in details (email, name, salary, etc.)
4. System generates temporary password
5. Share password with employee

### Reset Password
Admin can update `users.password_hash` directly in database, then update Supabase Auth via API.

---

## Security Notes

⚠️ **Plain Text Passwords**
- Database access = password access
- Implement Row Level Security (RLS)
- Encrypt database backups
- Restrict database access
- Monitor access logs

✅ **Supabase Auth Handles**
- Session management
- JWT tokens
- Token expiration
- Secure authentication

---

## Build Status
✅ Compiles successfully
✅ No TypeScript errors
✅ All routes functional
✅ Ready for testing

---

## Next Steps
1. ✅ Run database setup SQL
2. ✅ Start dev server
3. ✅ Test login with admin credentials
4. ✅ Change admin password
5. ✅ Create test employee
6. ✅ Test all features
7. ✅ Deploy to production

---

## Support
- Check browser console for frontend errors
- Check server logs for API errors
- Review Supabase Auth logs in dashboard
- Read documentation files for details

---

**Status**: ✅ READY FOR TESTING
**Last Updated**: May 22, 2026
