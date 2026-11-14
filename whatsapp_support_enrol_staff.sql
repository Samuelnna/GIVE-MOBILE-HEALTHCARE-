-- OWNER ONLY: edit the email/name below, then run in the Supabase SQL editor.
-- First create a separate account for this staff member through the normal site signup
-- (or Supabase Authentication), verify its email and ensure its profile is active.
-- Do not use the admin account. This grants no admin access.
DO $$
DECLARE staff_email text := 'REPLACE_WITH_STAFF_EMAIL';
        staff_name text := 'REPLACE_WITH_STAFF_NAME';
        staff_id uuid;
BEGIN
  IF staff_email='REPLACE_WITH_STAFF_EMAIL' OR staff_name='REPLACE_WITH_STAFF_NAME' THEN
    RAISE EXCEPTION 'Edit staff_email and staff_name before running this script';
  END IF;
  SELECT u.id INTO staff_id FROM auth.users u JOIN public.profiles p ON p.id=u.id
    WHERE lower(u.email)=lower(trim(staff_email)) AND p.status='active' AND p.user_type<>'admin';
  IF staff_id IS NULL THEN RAISE EXCEPTION 'No active non-admin account with that email. Create the account and active profile first.'; END IF;
  INSERT INTO public.whatsapp_support_staff_members(user_id,display_name,active)
    VALUES(staff_id,trim(staff_name),true)
    ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name,active=true;
END $$;

-- To revoke access later, run this separately with the actual email:
-- UPDATE public.whatsapp_support_staff_members SET active=false
-- WHERE user_id=(SELECT id FROM auth.users WHERE lower(email)=lower('STAFF_EMAIL'));
-- A remaining authorised staff member can take over the revoked operator's open requests.
