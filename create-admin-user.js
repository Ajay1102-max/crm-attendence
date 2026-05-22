/**
 * Recreate the default admin with Supabase Admin API.
 *
 * This avoids hand-written auth.users rows, which can cause:
 * "Database error querying schema" during password sign-in.
 *
 * Usage: node create-admin-user.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const ADMIN_EMAIL = 'admin@company.com';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_NAME = 'System Administrator';

function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');

  if (!fs.existsSync(envPath)) {
    console.error('Error: .env.local file not found');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};

  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });

  return envVars;
}

async function findAuthUserByEmail(supabase, email) {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;

    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function recreateAdminUser() {
  console.log('Starting admin recreation...');

  const env = loadEnv();

  if (!env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL not found in .env.local');
    process.exit(1);
  }

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
    process.exit(1);
  }

  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  try {
    const existingAuthUser = await findAuthUserByEmail(supabase, ADMIN_EMAIL);

    if (existingAuthUser) {
      console.log(`Existing auth admin found: ${existingAuthUser.id}`);
      console.log('Deleting existing auth admin so Supabase can recreate identities cleanly...');

      const { error: deleteError } = await supabase.auth.admin.deleteUser(existingAuthUser.id);
      if (deleteError) throw deleteError;
    }

    console.log('Creating admin in Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        name: ADMIN_NAME,
      },
    });

    if (authError || !authData.user) {
      throw authError || new Error('Supabase did not return a created auth user');
    }

    const adminId = authData.user.id;
    console.log(`Created auth admin: ${adminId}`);

    const profile = {
      id: adminId,
      email: ADMIN_EMAIL,
      password_hash: ADMIN_PASSWORD,
      name: ADMIN_NAME,
      role: 'admin',
      category: 'regular',
      monthly_salary: 0,
      joining_date: new Date().toISOString().slice(0, 10),
      is_active: true,
    };

    console.log('Upserting matching public.users profile...');

    const { data: existingProfileByEmail, error: profileLookupError } = await supabase
      .from('users')
      .select('id')
      .eq('email', ADMIN_EMAIL)
      .maybeSingle();

    if (profileLookupError) throw profileLookupError;

    let profileError;
    if (existingProfileByEmail) {
      const { error } = await supabase
        .from('users')
        .update(profile)
        .eq('email', ADMIN_EMAIL);
      profileError = error;
    } else {
      const { error } = await supabase
        .from('users')
        .insert(profile);
      profileError = error;
    }

    if (profileError) {
      console.error('Profile write failed. Rolling back auth admin...');
      await supabase.auth.admin.deleteUser(adminId);
      throw profileError;
    }

    console.log('');
    console.log('Admin recreated successfully.');
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log(`User ID: ${adminId}`);
    console.log('');
    console.log('Try logging in again at http://localhost:3000/login');
  } catch (error) {
    console.error('Admin recreation failed:', error.message || error);
    process.exit(1);
  }
}

recreateAdminUser();
