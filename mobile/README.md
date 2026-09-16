# MobileDoc — Expo app

Native iOS/Android/web client for the MobileDoc Healthcare platform. Same Supabase backend, Flutterwave checkout, and AI triage as the Next.js web app.

## Run

```bash
cd mobile
npm install
npx expo start
```

This client targets **Expo SDK 54**, which matches the Expo Go app on the App Store and Play Store. Scan the QR code from Expo Go on your phone, use an emulator, or press `w` for web.

## What’s in this build

- Role-based auth: patient, professional (license + selfie upload), admin
- Patient tabs: Home, Care, AI triage, Visits, Inbox, Profile
- Professional tabs: practice overview, visits, inbox, earnings
- Admin: pending professional approval + payment volume
- Live catalogs: doctors, hospitals, labs, pharmacy
- Booking + Flutterwave payment webview (consult, hospital, lab, pharmacy)
- Realtime messaging and AI triage via Gemini

## Env

Copied from the web app into `mobile/.env`:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GEMINI_API_KEY`
- `EXPO_PUBLIC_FLUTTERWAVE_PUBLIC_KEY`
- `EXPO_PUBLIC_API_URL` (optional) — website origin for secure payout setup. If omitted, the app uses your computer’s LAN IP on port 3000.

Payout and admin provider bank setup call the Next.js API at `/api/flutterwave/subaccount`. The Flutterwave secret stays on the server. Run the website (`npm run dev` in the repo root) when configuring payouts.
