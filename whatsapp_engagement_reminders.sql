-- Run AFTER whatsapp_triage_memory.sql, before deploying this WhatsApp update.
BEGIN;
CREATE TABLE IF NOT EXISTS public.whatsapp_participants (
  conversation_key TEXT PRIMARY KEY CHECK(length(conversation_key)=64),
  consent_version TEXT, consented_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(), last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  wizard TEXT, wizard_expires_at TIMESTAMPTZ,
  ai_turns INTEGER NOT NULL DEFAULT 0, ai_window_until TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_participants ADD COLUMN IF NOT EXISTS consent_epoch BIGINT NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS public.whatsapp_usage_events (
  id TEXT PRIMARY KEY, conversation_key TEXT,
  kind TEXT NOT NULL CHECK(kind IN ('inbound','processed','usage','consent','ai_reply','website_handoff','reminder_created','reminder_sent','reminder_failed','reminder_skipped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS whatsapp_usage_time ON public.whatsapp_usage_events(created_at,kind);
CREATE INDEX IF NOT EXISTS whatsapp_usage_contact ON public.whatsapp_usage_events(conversation_key,created_at);
CREATE TABLE IF NOT EXISTS public.whatsapp_medication_reminders (
  id UUID PRIMARY KEY, conversation_key TEXT NOT NULL REFERENCES public.whatsapp_participants(conversation_key),
  payload TEXT NOT NULL, times INTEGER[] NOT NULL CHECK(cardinality(times) BETWEEN 1 AND 6),
  ends_at TIMESTAMPTZ NOT NULL, next_due TIMESTAMPTZ NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lease UUID, locked_until TIMESTAMPTZ NOT NULL DEFAULT now(), attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);
CREATE INDEX IF NOT EXISTS whatsapp_reminder_due ON public.whatsapp_medication_reminders(next_due) WHERE active;
CREATE INDEX IF NOT EXISTS whatsapp_reminder_owner ON public.whatsapp_medication_reminders(conversation_key);
ALTER TABLE public.whatsapp_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_medication_reminders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_participants,public.whatsapp_usage_events,public.whatsapp_medication_reminders FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.whatsapp_participants,public.whatsapp_usage_events,public.whatsapp_medication_reminders TO service_role;

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
        IF p.consent_version IS DISTINCT FROM '2026-11-v1' OR p.ai_turns>=4 THEN RAISE EXCEPTION 'AI consent or turn limit'; END IF;
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

CREATE OR REPLACE FUNCTION public.whatsapp_claim_reminders(batch_size INTEGER DEFAULT 5)
RETURNS SETOF public.whatsapp_medication_reminders LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
  DELETE FROM public.whatsapp_medication_reminders WHERE NOT active AND ends_at<now()-interval '7 days';
  RETURN QUERY WITH due AS (
    SELECT r.id FROM public.whatsapp_medication_reminders r JOIN public.whatsapp_participants p USING(conversation_key)
    WHERE r.active AND r.next_due<=now() AND r.locked_until<=now() AND p.consent_version='2026-11-v1'
    ORDER BY r.next_due LIMIT LEAST(GREATEST(batch_size,1),5) FOR UPDATE OF r SKIP LOCKED
  ) UPDATE public.whatsapp_medication_reminders r SET lease=gen_random_uuid(),locked_until=now()+interval '90 seconds',attempts=attempts+1
    FROM due WHERE r.id=due.id RETURNING r.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.whatsapp_finish_reminder(reminder_id UUID, job_lease UUID, outcome TEXT, upcoming TIMESTAMPTZ DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE r public.whatsapp_medication_reminders%ROWTYPE; event_kind TEXT;
BEGIN
  SELECT * INTO r FROM public.whatsapp_medication_reminders WHERE id=reminder_id AND lease=job_lease FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF outcome NOT IN ('sent','failed','skipped') THEN RAISE EXCEPTION 'Invalid reminder outcome'; END IF;
  event_kind:='reminder_'||outcome;
  INSERT INTO public.whatsapp_usage_events(id,conversation_key,kind)
    VALUES(r.id::text||':'||r.next_due::text||':'||event_kind||CASE WHEN outcome='failed' THEN ':'||r.attempts::text ELSE '' END,r.conversation_key,event_kind)
    ON CONFLICT DO NOTHING;
  IF outcome='failed' THEN
    UPDATE public.whatsapp_medication_reminders SET active=attempts<3,locked_until=now()+interval '5 minutes',lease=NULL,last_error='SEND_FAILED' WHERE id=r.id;
  ELSE
    IF upcoming IS NOT NULL AND upcoming<=now() THEN RAISE EXCEPTION 'Upcoming must be future'; END IF;
    UPDATE public.whatsapp_medication_reminders SET active=upcoming IS NOT NULL AND upcoming<ends_at,
      next_due=COALESCE(upcoming,next_due),locked_until=now(),lease=NULL,attempts=0,last_error=NULL WHERE id=r.id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.whatsapp_traction_summary(report_since TIMESTAMPTZ DEFAULT NULL)
RETURNS JSONB LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
WITH events AS (SELECT * FROM public.whatsapp_usage_events WHERE created_at>=COALESCE(report_since,'-infinity'::timestamptz) AND created_at<=now()),
users AS (SELECT conversation_key,count(*) AS messages,count(DISTINCT (created_at AT TIME ZONE 'Africa/Lagos')::date) AS days FROM events WHERE kind='usage' GROUP BY conversation_key),
days AS (SELECT generate_series(((now() AT TIME ZONE 'Africa/Lagos')::date-13)::timestamp,((now() AT TIME ZONE 'Africa/Lagos')::date)::timestamp,interval '1 day')::date AS day)
SELECT jsonb_build_object(
  'trackingSince',(SELECT min(created_at) FROM public.whatsapp_usage_events),
  'contacts',(SELECT count(DISTINCT conversation_key) FROM events WHERE kind='inbound'),
  'users',(SELECT count(*) FROM users), 'messages',(SELECT count(*) FROM events WHERE kind='usage'),
  'inboundMessages',(SELECT count(*) FROM events WHERE kind='inbound'),
  'repeatUsers',(SELECT count(*) FROM users WHERE days>=2),
  'activeUserDays',COALESCE((SELECT sum(days) FROM users),0),
  'messagesPerUser',COALESCE((SELECT round(avg(messages),1) FROM users),0),
  'consents',(SELECT count(DISTINCT conversation_key) FROM events WHERE kind='consent'),
  'aiReplies',(SELECT count(*) FROM events WHERE kind='ai_reply'),
  'websiteHandoffs',(SELECT count(*) FROM events WHERE kind='website_handoff'),
  'remindersCreated',(SELECT count(*) FROM events WHERE kind='reminder_created'),
  'remindersSent',(SELECT count(*) FROM events WHERE kind='reminder_sent'),
  'reminderFailures',(SELECT count(*) FROM events WHERE kind='reminder_failed'),
  'remindersSkipped',(SELECT count(*) FROM events WHERE kind='reminder_skipped'),
  'activeReminders',(SELECT count(*) FROM public.whatsapp_medication_reminders WHERE active AND ends_at>now()),
  'daily',(SELECT jsonb_agg(jsonb_build_object('date',day,'users',(SELECT count(DISTINCT conversation_key) FROM events WHERE kind='usage' AND (created_at AT TIME ZONE 'Africa/Lagos')::date=day),
    'messages',(SELECT count(*) FROM events WHERE kind='usage' AND (created_at AT TIME ZONE 'Africa/Lagos')::date=day)) ORDER BY day) FROM days)
);
$$;
REVOKE ALL ON FUNCTION public.whatsapp_engagement_turn(TEXT,TEXT,TEXT,UUID,TEXT,TEXT,BOOLEAN,JSONB) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.whatsapp_claim_reminders(INTEGER) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.whatsapp_finish_reminder(UUID,UUID,TEXT,TIMESTAMPTZ) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.whatsapp_traction_summary(TIMESTAMPTZ) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_engagement_turn(TEXT,TEXT,TEXT,UUID,TEXT,TEXT,BOOLEAN,JSONB),public.whatsapp_claim_reminders(INTEGER),public.whatsapp_finish_reminder(UUID,UUID,TEXT,TIMESTAMPTZ),public.whatsapp_traction_summary(TIMESTAMPTZ) TO service_role;
COMMIT;
