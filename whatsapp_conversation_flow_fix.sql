-- Apply once to an existing WhatsApp engagement installation before deploying this fix.
-- Removes the old AI reply cutoff; consent, message deduplication, usage metrics,
-- reminder scheduling, and STOP protections remain enforced. No tables are dropped.
BEGIN;
CREATE OR REPLACE FUNCTION public.whatsapp_engagement_turn(
  operation TEXT, session_key TEXT, inbound_id TEXT, lease_id UUID,
  user_text TEXT DEFAULT NULL, reply_text TEXT DEFAULT NULL, clear_history BOOLEAN DEFAULT false,
  changes JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE state JSONB; p public.whatsapp_participants%ROWTYPE; r JSONB; already_prepared BOOLEAN;
BEGIN
  -- Keep lock ordering consistent with the underlying turn function: session,
  -- participant, then reminders. Never hold a participant lock before the session.
  INSERT INTO public.whatsapp_triage_sessions(conversation_key) VALUES(session_key) ON CONFLICT DO NOTHING;
  PERFORM 1 FROM public.whatsapp_triage_sessions WHERE conversation_key=session_key FOR UPDATE;
  IF operation='release' AND EXISTS(SELECT 1 FROM public.whatsapp_triage_deliveries WHERE message_id=inbound_id AND conversation_key=session_key AND sent) THEN
    UPDATE public.whatsapp_triage_sessions SET lease=NULL,locked_until=now() WHERE conversation_key=session_key AND lease=lease_id;
    RETURN jsonb_build_object('state','ok');
  END IF;
  IF operation='claim' AND changes->>'control' IN ('stop','stop_reminders') THEN
    INSERT INTO public.whatsapp_participants(conversation_key) VALUES(session_key) ON CONFLICT DO NOTHING;
    -- Cancellation takes effect even if an earlier failed reply is still pending.
    -- The epoch prevents an in-flight old turn from reactivating a schedule/consent.
    INSERT INTO public.whatsapp_usage_events(id,conversation_key,kind) VALUES(inbound_id||':control',session_key,'processed') ON CONFLICT DO NOTHING;
    IF FOUND THEN
      UPDATE public.whatsapp_participants SET wizard=NULL,consent_epoch=consent_epoch+1,
        consent_version=CASE WHEN changes->>'control'='stop' THEN NULL ELSE consent_version END,
        consented_at=CASE WHEN changes->>'control'='stop' THEN NULL ELSE consented_at END WHERE conversation_key=session_key;
      DELETE FROM public.whatsapp_medication_reminders WHERE conversation_key=session_key;
      UPDATE public.whatsapp_triage_sessions SET history='[]' WHERE conversation_key=session_key;
      UPDATE public.whatsapp_triage_deliveries SET reply=NULL,sent=true WHERE conversation_key=session_key AND message_id<>inbound_id;
    END IF;
  END IF;
  IF operation='prepare' THEN
    SELECT * INTO p FROM public.whatsapp_participants WHERE conversation_key=session_key FOR UPDATE;
    IF p.consent_epoch IS DISTINCT FROM COALESCE((changes->>'epoch')::bigint,p.consent_epoch) THEN RAISE EXCEPTION 'WhatsApp consent changed'; END IF;
    IF p.consent_version IS DISTINCT FROM '2026-11-v1' THEN clear_history:=true;user_text:='[consent request]'; END IF;
  END IF;
  -- The existing function enforces message ownership and the per-sender lease.
  state := public.whatsapp_triage_turn(operation,session_key,inbound_id,lease_id,user_text,reply_text,clear_history);
  IF operation='claim' THEN
    INSERT INTO public.whatsapp_participants(conversation_key) VALUES(session_key) ON CONFLICT DO NOTHING;
    UPDATE public.whatsapp_participants SET last_seen_at=now(),
      wizard=CASE WHEN wizard_expires_at>now() THEN wizard ELSE NULL END,
      ai_turns=CASE WHEN ai_window_until>now() THEN ai_turns ELSE 0 END
      WHERE conversation_key=session_key RETURNING * INTO p;
    INSERT INTO public.whatsapp_usage_events(id,conversation_key,kind) VALUES(inbound_id||':inbound',session_key,'inbound') ON CONFLICT DO NOTHING;
    IF state->>'state'='claimed' THEN
      SELECT EXISTS(SELECT 1 FROM public.whatsapp_usage_events WHERE id=inbound_id||':processed') INTO already_prepared;
      IF NOT already_prepared THEN
        UPDATE public.whatsapp_triage_deliveries SET reply=NULL WHERE message_id=inbound_id;
        state:=jsonb_set(state,'{reply}','null'::jsonb);
      END IF;
      IF p.consent_version IS DISTINCT FROM '2026-11-v1' THEN state:=jsonb_set(state,'{history}','[]'::jsonb); END IF;
      state:=state||jsonb_build_object('consented',p.consent_version='2026-11-v1','epoch',p.consent_epoch,'wizard',p.wizard,'ai_turns',p.ai_turns,
        'reminder_count',(SELECT count(*) FROM public.whatsapp_medication_reminders WHERE conversation_key=session_key AND active AND ends_at>now()));
    END IF;
  ELSIF operation='prepare' THEN
    SELECT * INTO p FROM public.whatsapp_participants WHERE conversation_key=session_key FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Missing WhatsApp participant'; END IF;
    SELECT EXISTS(SELECT 1 FROM public.whatsapp_usage_events WHERE id=inbound_id||':processed') INTO already_prepared;
    IF NOT already_prepared THEN
      IF changes->>'consent'='accept' THEN
        UPDATE public.whatsapp_participants SET consent_version='2026-11-v1',consented_at=now() WHERE conversation_key=session_key;
        INSERT INTO public.whatsapp_usage_events(id,conversation_key,kind) VALUES(inbound_id||':consent',session_key,'consent') ON CONFLICT DO NOTHING;
      ELSIF changes->>'consent'='revoke' THEN
        UPDATE public.whatsapp_participants SET consent_version=NULL,consented_at=NULL,wizard=NULL WHERE conversation_key=session_key;
        DELETE FROM public.whatsapp_medication_reminders WHERE conversation_key=session_key;
      END IF;
      IF changes ? 'wizard' THEN
        UPDATE public.whatsapp_participants SET wizard=changes->>'wizard',wizard_expires_at=now()+interval '30 minutes' WHERE conversation_key=session_key;
      END IF;
      IF COALESCE((changes->>'stop_reminders')::boolean,false) THEN
        DELETE FROM public.whatsapp_medication_reminders WHERE conversation_key=session_key;
        UPDATE public.whatsapp_participants SET wizard=NULL WHERE conversation_key=session_key;
      END IF;
      IF COALESCE((changes->>'ai_used')::boolean,false) THEN
        IF p.consent_version IS DISTINCT FROM '2026-11-v1' THEN RAISE EXCEPTION 'AI consent required'; END IF;
        UPDATE public.whatsapp_participants SET ai_turns=ai_turns+1,
          ai_window_until=CASE WHEN ai_window_until>now() THEN ai_window_until ELSE now()+interval '24 hours' END WHERE conversation_key=session_key;
        INSERT INTO public.whatsapp_usage_events(id,conversation_key,kind) VALUES(inbound_id||':ai',session_key,'ai_reply') ON CONFLICT DO NOTHING;
      END IF;
      IF changes ? 'create_reminder' THEN
        IF p.consent_version IS DISTINCT FROM '2026-11-v1' THEN RAISE EXCEPTION 'Reminder consent required'; END IF;
        IF (SELECT count(*) FROM public.whatsapp_medication_reminders WHERE conversation_key=session_key AND active AND ends_at>now())>=10 THEN RAISE EXCEPTION 'Reminder limit'; END IF;
        r:=changes->'create_reminder';
        IF (r->>'next_due')::timestamptz<=now() OR (r->>'ends_at')::timestamptz<=now() OR (r->>'ends_at')::timestamptz>now()+interval '91 days' THEN RAISE EXCEPTION 'Invalid reminder period'; END IF;
        IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(r->'times') t WHERE t::int NOT BETWEEN 0 AND 1439) THEN RAISE EXCEPTION 'Invalid reminder time'; END IF;
        INSERT INTO public.whatsapp_medication_reminders(id,conversation_key,payload,times,ends_at,next_due)
          VALUES((r->>'id')::uuid,session_key,r->>'payload',ARRAY(SELECT t::int FROM jsonb_array_elements_text(r->'times') t),
          (r->>'ends_at')::timestamptz,(r->>'next_due')::timestamptz) ON CONFLICT DO NOTHING;
        UPDATE public.whatsapp_participants SET wizard=NULL WHERE conversation_key=session_key;
        INSERT INTO public.whatsapp_usage_events(id,conversation_key,kind) VALUES(inbound_id||':reminder',session_key,'reminder_created') ON CONFLICT DO NOTHING;
      END IF;
      IF p.consent_version='2026-11-v1' AND changes->>'consent' IS DISTINCT FROM 'revoke' THEN
        INSERT INTO public.whatsapp_usage_events(id,conversation_key,kind) VALUES(inbound_id||':usage',session_key,'usage') ON CONFLICT DO NOTHING;
      END IF;
      IF COALESCE((changes->>'handoff')::boolean,false) THEN
        INSERT INTO public.whatsapp_usage_events(id,conversation_key,kind) VALUES(inbound_id||':handoff',session_key,'website_handoff') ON CONFLICT DO NOTHING;
      END IF;
      INSERT INTO public.whatsapp_usage_events(id,conversation_key,kind) VALUES(inbound_id||':processed',session_key,'processed') ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN state;
END;
$$;
REVOKE ALL ON FUNCTION public.whatsapp_engagement_turn(TEXT,TEXT,TEXT,UUID,TEXT,TEXT,BOOLEAN,JSONB) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_engagement_turn(TEXT,TEXT,TEXT,UUID,TEXT,TEXT,BOOLEAN,JSONB) TO service_role;
COMMIT;
