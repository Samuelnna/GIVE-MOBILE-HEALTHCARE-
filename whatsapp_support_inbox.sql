-- Apply after whatsapp_conversation_flow_fix.sql. Enable WHATSAPP_SUPPORT_ENABLED only afterwards.
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
CREATE TABLE IF NOT EXISTS public.whatsapp_support_threads (
  conversation_key text PRIMARY KEY REFERENCES public.whatsapp_triage_sessions(conversation_key),
  status text NOT NULL CHECK (status IN ('waiting','active','closed')),
  recipient text, assigned_to uuid REFERENCES auth.users(id),
  requested_at timestamptz NOT NULL DEFAULT now(), last_inbound_at timestamptz NOT NULL,
  last_inbound_id text NOT NULL
);
CREATE TABLE IF NOT EXISTS public.whatsapp_support_messages (
  id text PRIMARY KEY, conversation_key text NOT NULL REFERENCES public.whatsapp_support_threads(conversation_key),
  direction text NOT NULL CHECK(direction IN ('patient','staff')),
  payload text NOT NULL, staff_id uuid REFERENCES auth.users(id),
  state text NOT NULL DEFAULT 'received' CHECK(state IN ('received','sending','accepted','uncertain')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS whatsapp_support_message_time ON public.whatsapp_support_messages(conversation_key,created_at);
ALTER TABLE public.whatsapp_support_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_support_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_support_threads,public.whatsapp_support_messages FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.whatsapp_support_threads,public.whatsapp_support_messages TO service_role;

CREATE OR REPLACE FUNCTION public.whatsapp_support_turn(
  operation text, session_key text, inbound_id text, lease_id uuid,
  user_text text DEFAULT NULL, reply_text text DEFAULT NULL, clear_history boolean DEFAULT false,
  changes jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE t public.whatsapp_support_threads%ROWTYPE; s jsonb; consent_ok boolean; delivery public.whatsapp_triage_deliveries%ROWTYPE;
BEGIN
  INSERT INTO public.whatsapp_triage_sessions(conversation_key) VALUES(session_key) ON CONFLICT DO NOTHING;
  PERFORM 1 FROM public.whatsapp_triage_sessions WHERE conversation_key=session_key FOR UPDATE;
  SELECT * INTO t FROM public.whatsapp_support_threads WHERE conversation_key=session_key FOR UPDATE;
  SELECT consent_version='2026-11-v1' INTO consent_ok FROM public.whatsapp_participants WHERE conversation_key=session_key;
  IF operation='claim' THEN
    SELECT * INTO delivery FROM public.whatsapp_triage_deliveries WHERE message_id=inbound_id;
    IF delivery.message_id IS NOT NULL AND delivery.conversation_key<>session_key THEN RAISE EXCEPTION 'Message owner mismatch'; END IF;
    IF delivery.sent THEN RETURN jsonb_build_object('state','sent'); END IF;
    IF changes->>'control'='stop' THEN
      UPDATE public.whatsapp_support_threads SET status='closed',assigned_to=NULL,recipient=NULL WHERE conversation_key=session_key;
      DELETE FROM public.whatsapp_support_messages WHERE conversation_key=session_key;
      RETURN public.whatsapp_engagement_turn(operation,session_key,inbound_id,lease_id,user_text,reply_text,clear_history,changes);
    END IF;
    IF EXISTS(SELECT 1 FROM public.whatsapp_triage_sessions WHERE conversation_key=session_key AND locked_until>now()) THEN
      RETURN jsonb_build_object('state','busy');
    END IF;
    IF changes->>'control' IN ('stop','bot') OR NOT coalesce(consent_ok,false) THEN
      UPDATE public.whatsapp_support_threads SET status='closed',assigned_to=NULL,recipient=NULL WHERE conversation_key=session_key;
      DELETE FROM public.whatsapp_support_messages WHERE conversation_key=session_key;
    ELSIF t.status IN ('waiting','active') AND delivery.reply IS NULL AND coalesce(changes->>'control','')<>'stop_reminders' THEN
      IF changes->>'support_payload' IS NULL THEN RAISE EXCEPTION 'Missing encrypted message'; END IF;
      INSERT INTO public.whatsapp_support_messages(id,conversation_key,direction,payload)
        VALUES(inbound_id,session_key,'patient',changes->>'support_payload') ON CONFLICT DO NOTHING;
      UPDATE public.whatsapp_support_threads SET last_inbound_at=greatest(last_inbound_at,least((changes->>'support_at')::timestamptz,now())),last_inbound_id=inbound_id WHERE conversation_key=session_key;
      INSERT INTO public.whatsapp_triage_deliveries(message_id,conversation_key,sent) VALUES(inbound_id,session_key,true) ON CONFLICT DO NOTHING;
      UPDATE public.whatsapp_participants SET last_seen_at=now() WHERE conversation_key=session_key;
      INSERT INTO public.whatsapp_usage_events(id,conversation_key,kind) VALUES(inbound_id||':inbound',session_key,'inbound') ON CONFLICT DO NOTHING;
      RETURN jsonb_build_object('state','support_captured');
    END IF;
  END IF;
  -- All bot replies still use the existing leases, consent epochs and delivery receipts.
  s:=public.whatsapp_engagement_turn(operation,session_key,inbound_id,lease_id,user_text,reply_text,clear_history,changes);
  IF operation='prepare' AND changes->>'support_request' IS NOT NULL THEN
    IF NOT coalesce(consent_ok,false) THEN RAISE EXCEPTION 'Consent required'; END IF;
    INSERT INTO public.whatsapp_support_threads(conversation_key,status,recipient,last_inbound_at,last_inbound_id)
      VALUES(session_key,'waiting',changes->>'support_request',least((changes->>'support_at')::timestamptz,now()),inbound_id)
      ON CONFLICT(conversation_key) DO UPDATE SET status='waiting',recipient=excluded.recipient,assigned_to=NULL,requested_at=now(),last_inbound_at=excluded.last_inbound_at,last_inbound_id=excluded.last_inbound_id;
  END IF;
  RETURN s;
END $$;

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

CREATE OR REPLACE FUNCTION public.whatsapp_support_cleanup() RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path=public AS $$
  DELETE FROM public.whatsapp_support_messages WHERE created_at<now()-interval '7 days';
  UPDATE public.whatsapp_support_threads SET status='closed',recipient=NULL,assigned_to=NULL WHERE last_inbound_at<now()-interval '7 days';
$$;
REVOKE ALL ON FUNCTION public.whatsapp_support_turn(text,text,text,uuid,text,text,boolean,jsonb),public.whatsapp_support_staff(text,uuid,text,text,text,text),public.whatsapp_support_cleanup() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_support_turn(text,text,text,uuid,text,text,boolean,jsonb),public.whatsapp_support_staff(text,uuid,text,text,text,text),public.whatsapp_support_cleanup() TO service_role;
COMMIT;
