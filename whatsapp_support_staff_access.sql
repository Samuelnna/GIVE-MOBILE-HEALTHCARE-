-- Existing installations: run after whatsapp_support_inbox.sql. No staff are enrolled automatically.
BEGIN;
CREATE TABLE IF NOT EXISTS public.whatsapp_support_staff_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK(length(trim(display_name)) BETWEEN 1 AND 60),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_support_staff_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_support_staff_members FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.whatsapp_support_staff_members TO service_role;

CREATE OR REPLACE FUNCTION public.whatsapp_support_staff(
  action text, actor uuid, thread_key text DEFAULT NULL, outbound_id text DEFAULT NULL,
  encrypted_body text DEFAULT NULL, result_state text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE t public.whatsapp_support_threads%ROWTYPE; result jsonb;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.whatsapp_support_staff_members m JOIN public.profiles p ON p.id=m.user_id WHERE m.user_id=actor AND m.active AND p.status='active' AND p.user_type<>'admin') THEN RAISE EXCEPTION 'Active support staff access required'; END IF;
  -- Enforce retention on both reads and writes; run the scheduled cleanup even if the inbox is idle.
  DELETE FROM public.whatsapp_support_messages WHERE created_at<now()-interval '7 days';
  UPDATE public.whatsapp_support_threads SET status='closed',recipient=NULL,assigned_to=NULL WHERE last_inbound_at<now()-interval '7 days';
  IF action='list' THEN
    SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO result FROM (
      SELECT conversation_key,status,CASE WHEN EXISTS(SELECT 1 FROM public.whatsapp_support_staff_members m JOIN public.profiles p ON p.id=m.user_id WHERE m.user_id=assigned_to AND m.active AND p.status='active' AND p.user_type<>'admin') THEN assigned_to ELSE NULL END AS assigned_to,requested_at,last_inbound_at FROM public.whatsapp_support_threads
      WHERE status<>'closed' ORDER BY requested_at LIMIT 100
    ) x; RETURN result;
  END IF;
  PERFORM 1 FROM public.whatsapp_triage_sessions WHERE conversation_key=thread_key FOR UPDATE;
  SELECT * INTO t FROM public.whatsapp_support_threads WHERE conversation_key=thread_key FOR UPDATE;
  IF NOT FOUND OR t.status='closed' THEN RAISE EXCEPTION 'Support request is closed'; END IF;
  IF action='read' THEN
    IF t.assigned_to IS DISTINCT FROM actor THEN RAISE EXCEPTION 'Take over before viewing messages'; END IF;
    SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO result FROM (
      SELECT id,direction,payload,state,created_at FROM public.whatsapp_support_messages
      WHERE conversation_key=thread_key ORDER BY created_at DESC,id DESC LIMIT 100
    ) x; RETURN result;
  END IF;
  IF EXISTS(SELECT 1 FROM public.whatsapp_triage_sessions WHERE conversation_key=thread_key AND locked_until>now()) AND action NOT IN ('accepted','uncertain') THEN RAISE EXCEPTION 'Message delivery in progress; try again'; END IF;
  IF action='take' THEN
    IF t.assigned_to IS NOT NULL AND t.assigned_to<>actor AND EXISTS(SELECT 1 FROM public.whatsapp_support_staff_members m JOIN public.profiles p ON p.id=m.user_id WHERE m.user_id=t.assigned_to AND m.active AND p.status='active' AND p.user_type<>'admin') THEN RAISE EXCEPTION 'Another staff member has this conversation'; END IF;
    UPDATE public.whatsapp_support_threads SET status='active',assigned_to=actor WHERE conversation_key=thread_key;
  ELSIF action='close' THEN
    IF t.assigned_to IS DISTINCT FROM actor THEN RAISE EXCEPTION 'Only assigned staff can close'; END IF;
    UPDATE public.whatsapp_support_threads SET status='closed',recipient=NULL,assigned_to=NULL WHERE conversation_key=thread_key;
    DELETE FROM public.whatsapp_support_messages WHERE conversation_key=thread_key;
    UPDATE public.whatsapp_triage_sessions SET history='[]' WHERE conversation_key=thread_key;
  ELSIF action='reserve' THEN
    IF t.assigned_to IS DISTINCT FROM actor OR t.status<>'active' THEN RAISE EXCEPTION 'Take over first'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.whatsapp_participants WHERE conversation_key=thread_key AND consent_version='2026-11-v1') THEN RAISE EXCEPTION 'Consent withdrawn'; END IF;
    IF t.last_inbound_at<now()-interval '23 hours' THEN RAISE EXCEPTION 'Reply window closed; patient must message again'; END IF;
    IF outbound_id IS NULL OR encrypted_body IS NULL THEN RAISE EXCEPTION 'Invalid reply'; END IF;
    IF EXISTS(SELECT 1 FROM public.whatsapp_support_messages WHERE id=outbound_id) THEN RAISE EXCEPTION 'Reply already submitted; inspect delivery status before sending again'; END IF;
    INSERT INTO public.whatsapp_support_messages(id,conversation_key,direction,payload,staff_id,state) VALUES(outbound_id,thread_key,'staff',encrypted_body,actor,'sending');
    UPDATE public.whatsapp_triage_sessions SET lease=outbound_id::uuid,locked_until=now()+interval '90 seconds' WHERE conversation_key=thread_key;
    RETURN jsonb_build_object('recipient',t.recipient,'inbound',t.last_inbound_id);
  ELSIF action IN ('accepted','uncertain') THEN
    UPDATE public.whatsapp_support_messages SET state=action WHERE id=outbound_id AND conversation_key=thread_key AND staff_id=actor AND state='sending';
    UPDATE public.whatsapp_triage_sessions SET lease=NULL,locked_until=now() WHERE conversation_key=thread_key AND lease=outbound_id::uuid;
  ELSE RAISE EXCEPTION 'Unknown support operation'; END IF;
  RETURN jsonb_build_object('ok',true);
END $$;


REVOKE ALL ON FUNCTION public.whatsapp_support_staff(text,uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_support_staff(text,uuid,text,text,text,text) TO service_role;
COMMIT;
