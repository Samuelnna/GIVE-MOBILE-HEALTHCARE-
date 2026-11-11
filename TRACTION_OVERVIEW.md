# Admin traction overview

WhatsApp now has a separate aggregate section: consenting active users, repeat active days, messages per user, website links offered, and medication reminder activity, plus a 14-day WAT chart and CSV rows. It uses `whatsapp_traction_summary` from `whatsapp_engagement_reminders.sql` after active-admin authorization. It never fetches messages, phone numbers, or medication payloads into the report. Counts start with the new tracking events, not historical chat reconstruction. See WHATSAPP_ENGAGEMENT_SETUP.md for definitions and activation.

Open Admin → Traction. It loads only after that section is opened and requires an authenticated, active admin profile on the server. The browser receives aggregate metrics only, not patient identities, medical reports, payment references, or contact details. Refresh and CSV export are explicit actions.

Available periods: all time, last 30 days, and last 90 days. Signups use existing Supabase Auth accounts and their registration dates; deleted accounts cannot be reconstructed. Profile counts distinguish patients, professionals, and active professionals. Repeated payment users are counted by patient ID, not number of receipts. Queries paginate past the default database row limit.

Payment volume includes recorded successful/completed payments. NGN is summed separately from other currencies. It is gross payment volume, not revenue or profit. Estimated platform share uses current provider payout settings and labeled defaults when settings are missing. It does not reconstruct historical commission agreements, actual settlements, gateway fees, or refund adjustments. Unknown service types are excluded from the share estimate.

After active-admin authorization, loading or refreshing Traction reconciles supported MDOC-, GIVE-, and MOB- Flutterwave charges against saved payments. Missing charges are individually verified server-side, saved with their original gateway creation dates, and matched by transaction reference, gateway ID, or Flutterwave reference to avoid duplicates. Existing amount/currency conflicts are left for review. A gateway outage or unresolved charge produces a visible warning, also included in CSV exports, instead of claiming reconciliation succeeded. Deleted or unmatched customers remain unassigned. The browser receives aggregate results only.

Recovered payments without trusted checkout details use `gateway_unclassified`. They count toward gross payment volume but do not create bookings, grant paid consultation access, or enter the platform-share estimate. The UI reports unclassified volume. Existing v2 consultation checkouts use their original confirmation flow; mobile pharmacy checkouts use the existing atomic completion function. Website pharmacy/lab/hospital callbacks now verify the charge on the server and reuse any recovered payment before attaching their service details.

Configure Flutterwave's charge.completed webhook to `/api/flutterwave/webhook` with `FLUTTERWAVE_WEBHOOK_SECRET` matching its verification hash. The webhook verifies supported charges independently and records missing payments even when the browser closes. Traction reconciliation also recovers payments missed by webhook delivery. These changes must be deployed to the website host to run there.

For an operational check, run `node scripts/reconcile-payments.cjs` from the repository root (dry run). `node scripts/reconcile-payments.cjs --apply` applies individually verified recoveries. The script uses server environment credentials and prints aggregate results only. It can be rerun safely. Tests: `node scripts/test-payment-reconciliation.cjs`, `node scripts/test-consultation-checkout.cjs`, and `node scripts/test-traction.cjs`.

Consultations count appointment rows; completed consultations are those currently marked Completed. Orders count pharmacy order rows. Completed medicine orders are delivered OR patient-received, counted once even if both apply. Period filters use creation dates; completion dates are not available. Current professionals/patients/carts are snapshots and are labeled accordingly.

AI triage counts saved emr_records with record_type Triage, and distinct patients with those records. Opening the assistant, abandoned chats, and unsaved responses are not measured. No diagnostic text is fetched for analytics.

Cart metrics use only the current cart_items snapshot: total medicine units and the number of patient carts. Removing an item reduces this snapshot; checkout clearing removes the purchased cart contents. Historical additions, removals, and checkout events are not queried or displayed. No additional SQL is required. The older traction_cart_tracking.sql is not needed for this view.

Missing data sources are surfaced explicitly. Dashboard numbers are operational reporting, not audited financial statements. Page views, active sessions, retention, and native app installs are not currently tracked and are not invented.
