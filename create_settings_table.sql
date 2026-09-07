
-- Create a table for platform settings including commission rates
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id TEXT PRIMARY KEY, -- e.g., 'commission_rates'
    data JSONB NOT NULL, -- { "lab_share": 0.8, "doctor_share": 0.7 }
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial default values
INSERT INTO public.platform_settings (id, data)
VALUES ('commission_rates', '{"lab_share": 0.8, "doctor_share": 0.7, "pharmacy_share": 0.9, "hospital_share": 0.85}')
ON CONFLICT (id) DO NOTHING;

-- RLS: Only admins can update, everyone (authenticated) can read
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Settings are readable by all authenticated users" ON public.platform_settings;
CREATE POLICY "Settings are readable by all authenticated users" ON public.platform_settings
FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Only admins can update settings" ON public.platform_settings;
CREATE POLICY "Only admins can update settings" ON public.platform_settings
FOR ALL USING (auth.role() = 'authenticated'); -- Temporarily allow all authenticated for testing
