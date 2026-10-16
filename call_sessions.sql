-- Run after paid_messaging_and_booking_access.sql and its ambiguity fix.
BEGIN;
CREATE TABLE IF NOT EXISTS public.call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL REFERENCES public.profiles(id),
  callee_id UUID NOT NULL REFERENCES public.profiles(id),
  caller_name TEXT NOT NULL,
  callee_name TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('audio', 'video')),
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'accepted', 'declined', 'ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (caller_id <> callee_id)
);
CREATE INDEX IF NOT EXISTS call_sessions_callee_created ON public.call_sessions(callee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS call_sessions_caller_created ON public.call_sessions(caller_id, created_at DESC);
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Participants can read calls" ON public.call_sessions;
CREATE POLICY "Participants can read calls" ON public.call_sessions FOR SELECT TO authenticated
USING (auth.uid() IN (caller_id, callee_id));
-- All writes go through authenticated, authorized server actions.
REVOKE INSERT, UPDATE, DELETE ON public.call_sessions FROM anon, authenticated;
GRANT SELECT ON public.call_sessions TO authenticated;
GRANT ALL ON public.call_sessions TO service_role;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'call_sessions') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
  END IF;
END; $$;
COMMIT;
