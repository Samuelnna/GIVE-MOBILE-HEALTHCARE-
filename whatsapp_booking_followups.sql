-- Requires existing engagement and support inbox migrations. Apply before enabling the new feature flag.
BEGIN;
CREATE TABLE IF NOT EXISTS public.whatsapp_booking_followups(
  conversation_key text PRIMARY KEY REFERENCES public.whatsapp_triage_sessions(conversation_key),
  offered_at timestamptz, requested_at timestamptz, due_at timestamptz,
  payload text, status text NOT NULL DEFAULT 'idle' CHECK(status IN ('idle','pending','attempting','accepted','failed','cancelled','skipped')),
  last_inbound_at timestamptz NOT NULL DEFAULT now(), lease uuid, consent_epoch bigint, sent_at timestamptz
);
ALTER TABLE public.whatsapp_booking_followups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_booking_followups FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.whatsapp_booking_followups TO service_role;

CREATE OR REPLACE FUNCTION public.whatsapp_booking_followup_turn(
  operation text,session_key text,inbound_id text,lease_id uuid,user_text text DEFAULT NULL,
  reply_text text DEFAULT NULL,clear_history boolean DEFAULT false,changes jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE s jsonb; f public.whatsapp_booking_followups%ROWTYPE; already_prepared boolean;
BEGIN
  INSERT INTO public.whatsapp_triage_sessions(conversation_key) VALUES(session_key) ON CONFLICT DO NOTHING;
  PERFORM 1 FROM public.whatsapp_triage_sessions WHERE conversation_key=session_key FOR UPDATE;
  SELECT EXISTS(SELECT 1 FROM public.whatsapp_triage_deliveries WHERE message_id=inbound_id AND reply IS NOT NULL) INTO already_prepared;
  IF operation='claim' THEN UPDATE public.whatsapp_booking_followups SET last_inbound_at=greatest(last_inbound_at,least((changes->>'followup_inbound_at')::timestamptz,now())) WHERE conversation_key=session_key; END IF;
  IF operation='claim' AND changes->>'control' IN ('stop','bot','human','cancel_followup') THEN
    UPDATE public.whatsapp_booking_followups SET status='cancelled',payload=NULL,offered_at=NULL WHERE conversation_key=session_key;
  END IF;
  IF coalesce((changes->>'support_enabled')::boolean,false) THEN
    s:=public.whatsapp_support_turn(operation,session_key,inbound_id,lease_id,user_text,reply_text,clear_history,changes);
  ELSE
    s:=public.whatsapp_engagement_turn(operation,session_key,inbound_id,lease_id,user_text,reply_text,clear_history,changes);
  END IF;
  IF s->>'state'='support_captured' THEN
    UPDATE public.whatsapp_booking_followups SET status='cancelled',payload=NULL,offered_at=NULL WHERE conversation_key=session_key;
  ELSIF operation='prepare' AND NOT already_prepared THEN
    IF coalesce((changes->>'followup_cancel')::boolean,false) OR changes->>'consent'='revoke' THEN
      UPDATE public.whatsapp_booking_followups SET status='cancelled',payload=NULL,offered_at=NULL WHERE conversation_key=session_key;
    ELSIF coalesce((changes->>'followup_offer')::boolean,false) THEN
      INSERT INTO public.whatsapp_booking_followups(conversation_key,offered_at,last_inbound_at) VALUES(session_key,now(),least((changes->>'followup_inbound_at')::timestamptz,now()))
      ON CONFLICT(conversation_key) DO UPDATE SET offered_at=now();
    ELSIF changes->>'followup_request' IS NOT NULL THEN
      SELECT * INTO f FROM public.whatsapp_booking_followups WHERE conversation_key=session_key FOR UPDATE;
      IF f.offered_at IS NULL OR f.offered_at<now()-interval '12 hours' OR f.requested_at>now()-interval '7 days' THEN RAISE EXCEPTION 'No eligible followup offer'; END IF;
      IF NOT EXISTS(SELECT 1 FROM public.whatsapp_participants WHERE conversation_key=session_key AND consent_version='2026-11-v1') THEN RAISE EXCEPTION 'Consent required'; END IF;
      UPDATE public.whatsapp_booking_followups SET requested_at=now(),due_at=now()+interval '6 hours',status='pending',payload=changes->>'followup_request',lease=NULL,
        consent_epoch=(SELECT consent_epoch FROM public.whatsapp_participants WHERE conversation_key=session_key),offered_at=NULL WHERE conversation_key=session_key;
    END IF;
  END IF;
  IF operation='claim' AND s->>'state'='claimed' THEN
    SELECT * INTO f FROM public.whatsapp_booking_followups WHERE conversation_key=session_key;
    s:=s||jsonb_build_object('followup_eligible',f.offered_at>now()-interval '12 hours' AND (f.requested_at IS NULL OR f.requested_at<now()-interval '7 days'));
  END IF;
  RETURN s;
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_claim_booking_followups() RETURNS SETOF public.whatsapp_booking_followups
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE candidate public.whatsapp_booking_followups%ROWTYPE; f public.whatsapp_booking_followups%ROWTYPE; token uuid;
BEGIN
  UPDATE public.whatsapp_booking_followups SET payload=NULL WHERE requested_at<now()-interval '7 days' AND status<>'pending';
  FOR candidate IN SELECT * FROM public.whatsapp_booking_followups WHERE status='pending' AND due_at<=now() ORDER BY due_at LIMIT 10 LOOP
    -- Match inbound lock ordering: session first, then followup. Skip sessions being processed.
    PERFORM 1 FROM public.whatsapp_triage_sessions WHERE conversation_key=candidate.conversation_key AND locked_until<=now() FOR UPDATE SKIP LOCKED;
    IF NOT FOUND THEN CONTINUE; END IF;
    SELECT * INTO f FROM public.whatsapp_booking_followups WHERE conversation_key=candidate.conversation_key FOR UPDATE;
    IF f.status<>'pending' THEN CONTINUE; END IF;
    IF f.due_at<now()-interval '1 hour' OR NOT EXISTS(SELECT 1 FROM public.whatsapp_participants p WHERE p.conversation_key=f.conversation_key AND p.consent_version='2026-11-v1' AND p.consent_epoch=f.consent_epoch AND f.last_inbound_at>now()-interval '23 hours')
      OR EXISTS(SELECT 1 FROM public.whatsapp_support_threads t WHERE t.conversation_key=f.conversation_key AND t.status IN ('waiting','active'))
      OR EXISTS(SELECT 1 FROM public.whatsapp_triage_deliveries d WHERE d.conversation_key=f.conversation_key AND NOT d.sent) THEN
      UPDATE public.whatsapp_booking_followups SET status='skipped',payload=NULL WHERE conversation_key=f.conversation_key; CONTINUE;
    END IF;
    token:=gen_random_uuid();
    UPDATE public.whatsapp_triage_sessions SET lease=token,locked_until=now()+interval '90 seconds' WHERE conversation_key=f.conversation_key;
    UPDATE public.whatsapp_booking_followups SET status='attempting',lease=token WHERE conversation_key=f.conversation_key RETURNING * INTO f;
    RETURN NEXT f;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.whatsapp_finish_booking_followup(session_key text,token uuid,outcome text) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE allowed boolean;
BEGIN
  PERFORM 1 FROM public.whatsapp_triage_sessions WHERE conversation_key=session_key FOR UPDATE;
  SELECT EXISTS(SELECT 1 FROM public.whatsapp_booking_followups f JOIN public.whatsapp_participants p ON p.conversation_key=f.conversation_key
    WHERE f.conversation_key=session_key AND f.lease=token AND f.status='attempting' AND p.consent_version='2026-11-v1'
      AND p.consent_epoch=f.consent_epoch AND p.last_seen_at>now()-interval '23 hours'
      AND NOT EXISTS(SELECT 1 FROM public.whatsapp_support_threads t WHERE t.conversation_key=session_key AND t.status IN ('waiting','active'))
      AND EXISTS(SELECT 1 FROM public.whatsapp_triage_sessions s WHERE s.conversation_key=session_key AND s.lease=token AND s.locked_until>now())) INTO allowed;
  IF outcome='check' THEN RETURN allowed; END IF;
  IF outcome NOT IN ('accepted','failed','skipped') THEN RAISE EXCEPTION 'Invalid outcome'; END IF;
  UPDATE public.whatsapp_booking_followups SET status=outcome,payload=NULL,sent_at=CASE WHEN outcome='accepted' THEN now() ELSE sent_at END WHERE conversation_key=session_key AND lease=token AND status='attempting';
  UPDATE public.whatsapp_triage_sessions SET lease=NULL,locked_until=now() WHERE conversation_key=session_key AND lease=token;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_booking_followup_turn(text,text,text,uuid,text,text,boolean,jsonb),public.whatsapp_claim_booking_followups(),public.whatsapp_finish_booking_followup(text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_booking_followup_turn(text,text,text,uuid,text,text,boolean,jsonb),public.whatsapp_claim_booking_followups(),public.whatsapp_finish_booking_followup(text,uuid,text) TO service_role;
COMMIT;
