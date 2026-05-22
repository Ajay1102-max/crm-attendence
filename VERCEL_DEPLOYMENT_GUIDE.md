# Vercel Deployment Guide

## Issue
The application works on localhost but fails on Vercel because Vercel is using old environment variables pointing to the old Supabase project.

## Solution: Update Vercel Environment Variables

### Step 1: Go to Vercel Dashboard
1. Open your browser and go to [https://vercel.com](https://vercel.com)
2. Navigate to your project
3. Click on **Settings** tab
4. Click on **Environment Variables** in the left sidebar

### Step 2: Update/Add These 4 Environment Variables

Set the following environment variables with these exact values:

#### 1. NEXT_PUBLIC_SUPABASE_URL
```
https://lxshgillxjohtideuugq.supabase.co
```
- **Environments**: Production, Preview, Development (check all three)

#### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4c2hnaWxseGpvaHRpZGV1dWdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NDAxMDUsImV4cCI6MjA5NTAxNjEwNX0.rfiWSYF2DodiwDCFsxdgOC2lAlWyCmKMzV0pADxjFc0
```
- **Environments**: Production, Preview, Development (check all three)

#### 3. SUPABASE_URL
```
https://lxshgillxjohtideuugq.supabase.co
```
- **Environments**: Production, Preview, Development (check all three)

#### 4. SUPABASE_SERVICE_ROLE_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4c2hnaWxseGpvaHRpZGV1dWdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQ0MDEwNSwiZXhwIjoyMDk1MDE2MTA1fQ.EQgVBq86iVruzEAD8bJwpiloRp64w47--2IO08S4Xbw
```
- **Environments**: Production, Preview, Development (check all three)
- ⚠️ **IMPORTANT**: This is a sensitive key - keep it secret!

### Step 3: Delete Old Environment Variables
If you see any old Supabase environment variables with different URLs (like the old project), delete them to avoid conflicts.

### Step 4: Redeploy
After updating all environment variables:
1. Go to the **Deployments** tab
2. Click on the three dots (...) next to the latest deployment
3. Click **Redeploy**
4. OR simply push a new commit to trigger automatic deployment

### Step 5: Verify Database Schema
Make sure your new Supabase project has the correct schema by running the `FRESH_SUPABASE_PROJECT_MIGRATION.sql` file in the Supabase SQL Editor:

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/lxshgillxjohtideuugq
2. Click on **SQL Editor** in the left sidebar
3. Copy the contents of `FRESH_SUPABASE_PROJECT_MIGRATION.sql`
4. Paste and run it (if not already done)

### Step 6: Create Admin User
After the schema is set up, create an admin user by running:
```bash
node create-admin-user.js
```

## Troubleshooting

### If deployment still fails:
1. Check Vercel deployment logs for specific errors
2. Verify all 4 environment variables are set correctly
3. Make sure the new Supabase project has the correct schema
4. Clear Vercel build cache and redeploy

### Common Issues:
- **"relation does not exist" errors**: Database schema not migrated
- **"Unauthorized" errors**: Environment variables not updated
- **"Invalid API key" errors**: Wrong SUPABASE_SERVICE_ROLE_KEY

## Quick Checklist
- [ ] Updated NEXT_PUBLIC_SUPABASE_URL in Vercel
- [ ] Updated NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel
- [ ] Updated SUPABASE_URL in Vercel
- [ ] Updated SUPABASE_SERVICE_ROLE_KEY in Vercel
- [ ] Deleted old environment variables
- [ ] Redeployed on Vercel
- [ ] Verified database schema in new Supabase project
- [ ] Created admin user using create-admin-user.js
