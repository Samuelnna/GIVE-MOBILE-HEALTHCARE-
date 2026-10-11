MobileDoc App

### Paid patient-to-doctor messaging

Run `patient_doctor_messaging_payment_gate.sql` in the Supabase SQL Editor after the `messages` and `payments` tables exist. Doctor consultation payments are verified on the server before they are recorded. Configure `SUPABASE_SERVICE_ROLE_KEY` and `FLUTTERWAVE_SECRET_KEY` as server-only deployment environment variables; never expose either with a `NEXT_PUBLIC_` prefix. A patient can message a doctor only after a verified consultation payment for that same doctor.