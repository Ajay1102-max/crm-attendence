-- CRM Attendance - fresh Supabase project migration
--
-- Run this once in a NEW Supabase project's SQL Editor.
-- Do not run custom SQL against auth.users for user creation. After this
-- migration, create users through Supabase Auth Admin API / dashboard / app.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee', 'intern')),
  category TEXT DEFAULT 'regular' CHECK (category IN ('regular', 'contract', 'intern')),
  department TEXT,
  designation TEXT,
  monthly_salary NUMERIC(12, 2) DEFAULT 0,
  joining_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.office_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Main Office',
  latitude NUMERIC(10, 8) NOT NULL,
  longitude NUMERIC(11, 8) NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 500,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.office_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_start_time TIME DEFAULT '09:00',
  office_end_time TIME DEFAULT '18:00',
  late_buffer_minutes INTEGER DEFAULT 5,
  markout_buffer_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'present',
    'absent',
    'half_day',
    'late_within_buffer',
    'approved_short_leave',
    'extra_approved_short_leave'
  )),
  selfie_url TEXT,
  attendance_value NUMERIC(4, 2) DEFAULT 1,
  is_late BOOLEAN DEFAULT false,
  late_count INTEGER DEFAULT 0,
  gps_data JSONB,
  admin_marked BOOLEAN DEFAULT false,
  admin_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days NUMERIC(5, 2) DEFAULT 1,
  reason TEXT,
  type TEXT NOT NULL DEFAULT 'full_day' CHECK (type IN ('full_day', 'half_day', 'sick', 'casual', 'earned', 'personal')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  remarks TEXT,
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.short_leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  short_leave_type TEXT DEFAULT 'morning' CHECK (short_leave_type IN ('morning', 'evening')),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.salary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  working_days INTEGER DEFAULT 0,
  per_day_salary NUMERIC(12, 2) DEFAULT 0,
  total_attendance_value NUMERIC(8, 2) DEFAULT 0,
  payable_salary NUMERIC(12, 2) DEFAULT 0,
  deductions NUMERIC(12, 2) DEFAULT 0,
  bonus_amount NUMERIC(12, 2) DEFAULT 0,
  bonus_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, year, month)
);

CREATE TABLE IF NOT EXISTS public.salary_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  working_days INTEGER DEFAULT 0,
  payable_salary NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, year, month)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional metadata table used by older client helpers.
CREATE TABLE IF NOT EXISTS public.selfies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_active ON public.users(role, is_active);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON public.attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON public.leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_short_leaves_employee_date ON public.short_leaves(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_short_leaves_status ON public.short_leaves(status);
CREATE INDEX IF NOT EXISTS idx_salary_employee_month ON public.salary(employee_id, year, month);

-- ---------------------------------------------------------------------------
-- Utility trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_users_updated_at ON public.users;
CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_office_locations_updated_at ON public.office_locations;
CREATE TRIGGER set_office_locations_updated_at
  BEFORE UPDATE ON public.office_locations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_attendance_updated_at ON public.attendance;
CREATE TRIGGER set_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_leave_requests_updated_at ON public.leave_requests;
CREATE TRIGGER set_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_short_leaves_updated_at ON public.short_leaves;
CREATE TRIGGER set_short_leaves_updated_at
  BEFORE UPDATE ON public.short_leaves
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RPC functions kept for older client helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.to_ist(utc_time TIMESTAMPTZ)
RETURNS TIMESTAMP AS $$
BEGIN
  RETURN utc_time AT TIME ZONE 'Asia/Kolkata';
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.today_ist()
RETURNS TEXT AS $$
BEGIN
  RETURN TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD');
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.mark_attendance(
  employee_id_param UUID,
  check_in_time TIMESTAMPTZ,
  selfie_url_param TEXT,
  gps_data_param JSONB
)
RETURNS JSONB AS $$
DECLARE
  date_param TEXT := public.today_ist();
  attendance_id UUID;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.attendance
    WHERE employee_id = employee_id_param AND date = date_param
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Attendance already marked for today');
  END IF;

  INSERT INTO public.attendance (
    employee_id,
    date,
    check_in,
    status,
    selfie_url,
    attendance_value,
    gps_data
  )
  VALUES (
    employee_id_param,
    date_param,
    check_in_time,
    'present',
    selfie_url_param,
    1,
    gps_data_param
  )
  RETURNING id INTO attendance_id;

  RETURN jsonb_build_object('success', true, 'attendance_id', attendance_id, 'status', 'present');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.mark_checkout(
  employee_id_param UUID,
  checkout_time TIMESTAMPTZ
)
RETURNS JSONB AS $$
DECLARE
  date_param TEXT := public.today_ist();
BEGIN
  UPDATE public.attendance
  SET check_out = checkout_time
  WHERE employee_id = employee_id_param
    AND date = date_param
    AND check_out IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No open attendance record for today');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_today_attendance(employee_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  attendance_record RECORD;
BEGIN
  SELECT * INTO attendance_record
  FROM public.attendance
  WHERE employee_id = employee_id_param
    AND date = public.today_ist();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No attendance record for today');
  END IF;

  RETURN jsonb_build_object('success', true, 'data', row_to_json(attendance_record));
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.apply_leave(
  employee_id_param UUID,
  leave_type_param TEXT,
  start_date_param DATE,
  end_date_param DATE,
  reason_param TEXT
)
RETURNS JSONB AS $$
DECLARE
  leave_id UUID;
  total_days NUMERIC;
BEGIN
  total_days := (end_date_param - start_date_param) + 1;

  INSERT INTO public.leave_requests (
    employee_id,
    start_date,
    end_date,
    total_days,
    reason,
    type,
    status
  )
  VALUES (
    employee_id_param,
    start_date_param,
    end_date_param,
    total_days,
    reason_param,
    leave_type_param,
    'pending'
  )
  RETURNING id INTO leave_id;

  RETURN jsonb_build_object('success', true, 'leave_id', leave_id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.approve_leave(
  leave_id_param UUID,
  admin_id_param UUID,
  approve_status TEXT
)
RETURNS JSONB AS $$
BEGIN
  UPDATE public.leave_requests
  SET status = approve_status,
      approved_by = admin_id_param,
      approved_at = NOW()
  WHERE id = leave_id_param;

  RETURN jsonb_build_object('success', FOUND, 'status', approve_status);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.apply_short_leave(
  employee_id_param UUID,
  short_leave_type TEXT,
  reason_param TEXT
)
RETURNS JSONB AS $$
DECLARE
  short_leave_id UUID;
BEGIN
  INSERT INTO public.short_leaves (
    employee_id,
    date,
    short_leave_type,
    reason,
    status
  )
  VALUES (
    employee_id_param,
    CURRENT_DATE,
    short_leave_type,
    reason_param,
    'pending'
  )
  RETURNING id INTO short_leave_id;

  RETURN jsonb_build_object('success', true, 'short_leave_id', short_leave_id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.calculate_leave_balance(employee_id_param UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN jsonb_build_object(
    'success', true,
    'monthly_credit', 1.5,
    'total_earned', 0,
    'total_used', 0,
    'total_available', 0
  );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.calculate_salary(
  employee_id_param UUID,
  year_param INTEGER,
  month_param INTEGER
)
RETURNS JSONB AS $$
DECLARE
  salary_id UUID;
BEGIN
  INSERT INTO public.salary (employee_id, year, month)
  VALUES (employee_id_param, year_param, month_param)
  ON CONFLICT (employee_id, year, month) DO UPDATE
  SET updated_at = NOW()
  RETURNING id INTO salary_id;

  RETURN jsonb_build_object('success', true, 'salary_id', salary_id);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.calculate_diwali_bonus(employee_id_param UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN jsonb_build_object('success', true, 'total_bonus', 0);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.calculate_internship_bonus(employee_id_param UUID)
RETURNS JSONB AS $$
BEGIN
  RETURN jsonb_build_object('success', true, 'total_bonus', 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
-- RLS is intentionally disabled for this project baseline to avoid setup
-- failures while you are stabilizing the app. Most writes go through Next.js
-- API routes using the Supabase service-role key.
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.short_leaves DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.selfies DISABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage bucket for selfies
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('selfies', 'selfies', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Authenticated users can upload selfies" ON storage.objects;
CREATE POLICY "Authenticated users can upload selfies" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'selfies');

DROP POLICY IF EXISTS "Anyone can view selfies" ON storage.objects;
CREATE POLICY "Anyone can view selfies" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'selfies');

DROP POLICY IF EXISTS "Users can delete own selfies" ON storage.objects;
CREATE POLICY "Users can delete own selfies" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'selfies');

-- ---------------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------------
INSERT INTO public.office_locations (name, latitude, longitude, radius_meters, is_active)
VALUES ('Main Office', 28.61390000, 77.20900000, 500, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.office_settings DEFAULT VALUES
ON CONFLICT DO NOTHING;

INSERT INTO public.holidays (date, name, description, is_active)
VALUES
  ('2026-01-26', 'Republic Day', 'National Holiday', true),
  ('2026-03-25', 'Holi', 'National Holiday', true),
  ('2026-08-15', 'Independence Day', 'National Holiday', true),
  ('2026-10-02', 'Gandhi Jayanti', 'National Holiday', true),
  ('2026-11-08', 'Diwali', 'National Holiday', true),
  ('2026-12-25', 'Christmas', 'National Holiday', true)
ON CONFLICT (date) DO NOTHING;

-- Final check
SELECT
  'fresh migration complete' AS status,
  COUNT(*) FILTER (WHERE table_name IN (
    'users',
    'attendance',
    'leave_requests',
    'short_leaves',
    'holidays',
    'office_locations',
    'salary'
  )) AS expected_tables_found
FROM information_schema.tables
WHERE table_schema = 'public';
