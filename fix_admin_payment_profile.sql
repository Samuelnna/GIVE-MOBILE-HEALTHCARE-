-- Only needed if the dashboard reports that its account has no active admin profile.
-- This is the existing admin login email configured in app/admin/page.tsx.
-- Run as project owner in Supabase SQL Editor, never from the browser.
BEGIN;
DO $$
DECLARE
  admin_id UUID;
  existing_user_type_rule TEXT;
BEGIN
  SELECT id INTO admin_id FROM auth.users
  WHERE LOWER(email) = 'admin@givehealthcare.com' AND email_confirmed_at IS NOT NULL;
  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'The existing admin login has no confirmed auth account. No changes made.';
  END IF;

  -- Preserve the live database's allowed user types and additionally allow admin.
  -- The whole repair rolls back if any later step fails.
  LOCK TABLE public.profiles IN ACCESS EXCLUSIVE MODE;
  SELECT pg_get_expr(conbin, conrelid)
  INTO existing_user_type_rule
  FROM pg_constraint
  WHERE conrelid = 'public.profiles'::regclass
    AND conname = 'profiles_user_type_check'
    AND contype = 'c';

  IF existing_user_type_rule IS NOT NULL THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_user_type_check;
    EXECUTE format(
      'ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_type_check CHECK ((%s) OR user_type = %L)',
      existing_user_type_rule, 'admin'
    );
  END IF;

  INSERT INTO public.profiles (id, full_name, email, user_type, status)
  VALUES (admin_id, 'Administrator', 'admin@givehealthcare.com', 'admin', 'active')
  ON CONFLICT (id) DO UPDATE SET user_type = 'admin', status = 'active';
END;
$$;
COMMIT;

-- Confirm that the repaired profile matches the account used to sign in.
SELECT p.id, p.email, p.user_type, p.status
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE LOWER(u.email) = 'admin@givehealthcare.com';
