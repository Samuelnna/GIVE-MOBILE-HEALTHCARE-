# Consultation payment setup

1. Run `consultation_payments_v2.sql` in the correct project's Supabase SQL Editor.
2. Keep `SUPABASE_SERVICE_ROLE_KEY` and `FLUTTERWAVE_SECRET_KEY` in `.env.local` (never use NEXT_PUBLIC names for secrets). Restart `npm run dev`.
3. Checkout now saves a pending payment before opening Flutterwave. If saving fails, checkout does not open. Confirmation independently verifies reference, amount, currency, and payer email before changing the saved record to successful. It no longer depends on Flutterwave returning consultation metadata.
4. If browser confirmation fails, open My Records → Payments → Check payment. This verifies the same charge; it does not charge again. Confirmation and webhook delivery can repeat safely without duplicate payment rows.
5. For browser-independent confirmation, set `FLUTTERWAVE_WEBHOOK_SECRET` to a random secret in `.env.local`. In Flutterwave v3 webhook settings, set the same secret hash and enable retries. Use `https://YOUR_PUBLIC_HOST/api/flutterwave/webhook`. Restart the server after changing environment variables. Flutterwave cannot reach localhost directly: use a public HTTPS tunnel to your running local server, or deploy. Without that setup, use Check payment after reopening the app.

The webhook authenticates `verif-hash`, then independently verifies the transaction with Flutterwave before marking it successful. It returns an error on verification/database failure so Flutterwave can retry.

Pending means checkout started, not that money was received. Cancelled/unpaid attempts stay pending and do not unlock consultations. The existing fee is NGN 100. Payment saving is independent of appointment creation: a recovered payment may need support to arrange its appointment. This change does not reconstruct old charges without a saved v2 checkout; reconcile those using verified transaction details, never by guessing successful rows in SQL.

Before production, test with Flutterwave test keys: normal success, closing the tab before confirmation, Check payment after returning, duplicate webhook delivery, wrong reference/amount/email, and a database error before checkout. No live payment was used for implementation validation.
