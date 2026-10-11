MobileDoc App

### Paid patient-to-professional messaging

Run `patient_doctor_messaging_payment_gate.sql` in the Supabase SQL Editor after the `messages` and `payments` tables exist. Consultation payments for all medical professionals are verified on the server before they are recorded. Configure `SUPABASE_SERVICE_ROLE_KEY` and `FLUTTERWAVE_SECRET_KEY` as server-only environment variables both locally and in the deployment host; never expose either with a `NEXT_PUBLIC_` prefix. A patient can message a professional only after a verified consultation payment for that same professional.