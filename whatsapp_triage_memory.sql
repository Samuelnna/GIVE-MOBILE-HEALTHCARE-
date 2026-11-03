-- Run once in the project's Supabase SQL Editor before deploying WhatsApp triage.
-- Separate from patient records. Only the server service role can access it.
BEGIN;
CREATE TABLE IF NOT EXISTS public.whatsapp_triage_sessions (
  conversation_key TEXT PRIMARY KEY CHECK (length(conversation_key) = 64),
  history JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(history) = 'array'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '24 hours',
  lease UUID,
  locked_until TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.whatsapp_triage_deliveries (
  message_id TEXT PRIMARY KEY,
  conversation_key TEXT NOT NULL REFERENCES public.whatsapp_triage_sessions(conversation_key) ON DELETE CASCADE,
  reply TEXT,
  sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '24 hours'
);
CREATE INDEX IF NOT EXISTS whatsapp_triage_session_expiry ON public.whatsapp_triage_sessions(expires_at);
CREATE INDEX IF NOT EXISTS whatsapp_triage_delivery_session ON public.whatsapp_triage_deliveries(conversation_key);
CREATE INDEX IF NOT EXISTS whatsapp_triage_delivery_expiry ON public.whatsapp_triage_deliveries(expires_at);
ALTER TABLE public.whatsapp_triage_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_triage_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_triage_sessions, public.whatsapp_triage_deliveries FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.whatsapp_triage_sessions, public.whatsapp_triage_deliveries TO service_role;

-- A lease serializes each sender across serverless instances. Prepared responses
-- survive failed sends so Meta retries do not repeat the assessment/history turn.
CREATE OR REPLACE FUNCTION public.whatsapp_triage_turn(
  operation TEXT, session_key TEXT, inbound_id TEXT, lease_id UUID,
  user_text TEXT DEFAULT NULL, reply_text TEXT DEFAULT NULL, clear_history BOOLEAN DEFAULT false
) RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE s public.whatsapp_triage_sessions%ROWTYPE;
        d public.whatsapp_triage_deliveries%ROWTYPE;
        next_history JSONB;
BEGIN
  IF session_key IS NULL OR length(session_key) <> 64 OR inbound_id IS NULL OR length(inbound_id) NOT BETWEEN 1 AND 300 OR lease_id IS NULL THEN
    RAISE EXCEPTION 'Invalid WhatsApp turn';
  END IF;
  IF operation = 'claim' THEN
    -- Expired context is never loaded; expired data is physically removed on use.
    DELETE FROM public.whatsapp_triage_sessions WHERE expires_at < now() AND locked_until < now();
    DELETE FROM public.whatsapp_triage_deliveries WHERE expires_at < now();
    INSERT INTO public.whatsapp_triage_sessions(conversation_key) VALUES(session_key) ON CONFLICT DO NOTHING;
  END IF;
  SELECT * INTO s FROM public.whatsapp_triage_sessions WHERE conversation_key = session_key FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Missing WhatsApp session'; END IF;
  SELECT * INTO d FROM public.whatsapp_triage_deliveries WHERE message_id = inbound_id;
  IF FOUND AND d.conversation_key <> session_key THEN RAISE EXCEPTION 'Message owner mismatch'; END IF;
  IF operation = 'claim' THEN
    IF d.sent THEN RETURN jsonb_build_object('state','sent'); END IF;
    IF s.locked_until > now() THEN RETURN jsonb_build_object('state','busy'); END IF;
    IF EXISTS (SELECT 1 FROM public.whatsapp_triage_deliveries WHERE conversation_key = session_key AND message_id <> inbound_id AND NOT sent) THEN
      RETURN jsonb_build_object('state','busy');
    END IF;
    INSERT INTO public.whatsapp_triage_deliveries(message_id,conversation_key) VALUES(inbound_id,session_key) ON CONFLICT DO NOTHING;
    UPDATE public.whatsapp_triage_sessions SET lease = lease_id, locked_until = now() + interval '90 seconds' WHERE conversation_key = session_key;
    RETURN jsonb_build_object('state','claimed','history',CASE WHEN s.expires_at > now() THEN s.history ELSE '[]'::jsonb END,'reply',d.reply);
  END IF;
  IF s.lease IS DISTINCT FROM lease_id OR s.locked_until <= now() THEN RAISE EXCEPTION 'WhatsApp lease expired'; END IF;
  IF d.message_id IS NULL THEN RAISE EXCEPTION 'Missing WhatsApp delivery'; END IF;
  IF operation = 'prepare' THEN
    IF reply_text IS NULL OR length(reply_text) NOT BETWEEN 1 AND 4000 OR user_text IS NULL OR length(user_text) > 4000 THEN
      RAISE EXCEPTION 'Invalid WhatsApp reply';
    END IF;
    IF d.reply IS NULL THEN
      IF clear_history THEN
        next_history := '[]'::jsonb;
        -- Forget stored text while retaining receipt IDs to suppress duplicates.
        UPDATE public.whatsapp_triage_deliveries SET reply = NULL WHERE conversation_key = session_key AND sent;
      ELSE
        next_history := (CASE WHEN s.expires_at > now() THEN s.history ELSE '[]'::jsonb END)
          || jsonb_build_array(jsonb_build_object('role','user','text',user_text),jsonb_build_object('role','model','text',reply_text));
        SELECT COALESCE(jsonb_agg(value ORDER BY ordinality),'[]'::jsonb) INTO next_history
          FROM jsonb_array_elements(next_history) WITH ORDINALITY WHERE ordinality > jsonb_array_length(next_history) - 20;
      END IF;
      UPDATE public.whatsapp_triage_sessions SET history = next_history, expires_at = now() + interval '24 hours' WHERE conversation_key = session_key;
      UPDATE public.whatsapp_triage_deliveries SET reply = reply_text WHERE message_id = inbound_id;
    END IF;
  ELSIF operation = 'finish' THEN
    IF d.reply IS NULL THEN RAISE EXCEPTION 'Reply not prepared'; END IF;
    UPDATE public.whatsapp_triage_deliveries SET sent = true WHERE message_id = inbound_id;
    UPDATE public.whatsapp_triage_sessions SET lease = NULL, locked_until = now() WHERE conversation_key = session_key;
  ELSIF operation = 'release' THEN
    DELETE FROM public.whatsapp_triage_deliveries WHERE message_id = inbound_id AND reply IS NULL;
    UPDATE public.whatsapp_triage_sessions SET lease = NULL, locked_until = now() WHERE conversation_key = session_key;
  ELSE RAISE EXCEPTION 'Unsupported WhatsApp operation';
  END IF;
  RETURN jsonb_build_object('state','ok');
END;
$$;
REVOKE ALL ON FUNCTION public.whatsapp_triage_turn(TEXT,TEXT,TEXT,UUID,TEXT,TEXT,BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_triage_turn(TEXT,TEXT,TEXT,UUID,TEXT,TEXT,BOOLEAN) TO service_role;
COMMIT;
