# Admin traction overview

Open Admin → Traction. It loads only after that section is opened and requires an authenticated, active admin profile on the server. The browser receives aggregate metrics only, not patient identities, medical reports, payment references, or contact details. Refresh and CSV export are explicit actions.

Available periods: all time, last 30 days, and last 90 days. Signups use existing Supabase Auth accounts and their registration dates; deleted accounts cannot be reconstructed. Profile counts distinguish patients, professionals, and active professionals. Repeated payment users are counted by patient ID, not number of receipts. Queries paginate past the default database row limit.

Payment volume includes recorded successful/completed payments. NGN is summed separately from other currencies. It is gross payment volume, not revenue or profit. Estimated platform share uses current provider payout settings and labeled defaults when settings are missing. It does not reconstruct historical commission agreements, actual settlements, gateway fees, or refund adjustments. Unknown service types are excluded from the share estimate. Existing medicine payments are callback-recorded; these analytics do not independently reverify them with Flutterwave.

Consultations count appointment rows; completed consultations are those currently marked Completed. Orders count pharmacy order rows. Completed medicine orders are delivered OR patient-received, counted once even if both apply. Period filters use creation dates; completion dates are not available. Current professionals/patients/carts are snapshots and are labeled accordingly.

AI triage counts saved emr_records with record_type Triage, and distinct patients with those records. Opening the assistant, abandoned chats, and unsaved responses are not measured. No diagnostic text is fetched for analytics.

Cart metrics use only the current cart_items snapshot: total medicine units and the number of patient carts. Removing an item reduces this snapshot; checkout clearing removes the purchased cart contents. Historical additions, removals, and checkout events are not queried or displayed. No additional SQL is required. The older traction_cart_tracking.sql is not needed for this view.

Missing data sources are surfaced explicitly. Dashboard numbers are operational reporting, not audited financial statements. Page views, active sessions, retention, and native app installs are not currently tracked and are not invented.
