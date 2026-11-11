# WhatsApp consent, traction, and medication reminders

## Deploy consent and traction

1. The previously deployed `whatsapp_triage_memory.sql` is a prerequisite. Run the new **`whatsapp_engagement_reminders.sql`** in Supabase SQL Editor. It can be rerun safely. No existing healthcare, appointment, or payment tables are changed.
2. Keep the existing Netlify Gemini, WhatsApp, Supabase URL, and Supabase service-role environment variables. Deploy all changed files, including the new Netlify scheduled function.
3. Send HELLO. Every contact, including existing bot users, must now select **Yes, continue** (or type those exact words) before AI processing. A symptom message before consent is not forwarded to Gemini or added to chat history. The introductory consent message contains privacy information and an emergency-care notice.
4. Test Admin → Traction → the new WhatsApp section. Tracking begins after this update; previous chats cannot be reconstructed reliably. Missing database setup is shown as unavailable, not zero.

Consent is versioned (`2026-11-v1`) and separate from website account sign-in. STOP or No thanks withdraws permission and removes reminder schedules. The cancellation is effective even when an old reply is pending, and a consent epoch prevents an in-flight older turn from restoring permission. An outbound message already accepted/in flight cannot be recalled. RESET clears recent chat but does not renew consent, reset the AI allowance, or cancel reminders.

## Activate scheduled medication reminders

The consent/menu/traction update works without reminder configuration. Until the three reminder variables below are set, choosing reminders explicitly says that reminders are not available. No schedule is falsely confirmed.

1. **Create a WhatsApp message template in Meta's WhatsApp Manager.** Use `whatsapp-reminder-template.json` as the reviewable draft: name `mobiledoc_medication_reminder`, language English (US) `en_US`, proposed Utility category, three body parameters in the exact order **medicine, saved dose, scheduled WAT time**. The draft is not automatically submitted or approved. Meta may require changes or assign another category. Keep three parameters in that order if you change its text.
2. **Wait until Meta marks the template approved.** Scheduled reminders can occur outside the customer-service messaging window and therefore use the approved template, rather than relying on a recent chat. See [WhatsApp's business messaging policy](https://whatsappbusiness.com/policy/).
3. A random `WHATSAPP_REMINDER_ENCRYPTION_KEY` was created privately in local `.env.local`. Copy its value into Netlify's environment variables, scoped to Functions. Do not share it, add a NEXT_PUBLIC prefix, or rotate it after saving schedules without migrating the encrypted data. To initialize another environment, run `node scripts/create-whatsapp-reminder-key.cjs`; it will not overwrite an existing key.
4. Add Netlify function environment variables:

   ```env
   WHATSAPP_REMINDER_TEMPLATE=mobiledoc_medication_reminder
   WHATSAPP_REMINDER_TEMPLATE_LANGUAGE=en_US
   WHATSAPP_REMINDER_ENCRYPTION_KEY=copy_the_existing_64_hex_character_local_value
   ```

   Only set the template variable after approval; its presence is the operator's readiness declaration. Use the actual approved template name/language if different.
5. Deploy again. Netlify should list **whatsapp-medication-reminders** with a once-per-minute schedule. The default Netlify functions directory is `netlify/functions`; if the site overrides it in its dashboard, point it there or merge this function into the configured directory. Scheduled functions run on published production deployments; inspect the Functions schedule and logs to confirm they are enabled. [Netlify scheduled-function documentation](https://docs.netlify.com/build/functions/scheduled-functions/).
6. Test with your own verified test recipient using a **fictional medicine/saved dose**, exact clock times a few minutes in the future, and an appropriate duration. Send CONFIRM REMINDERS only after reading the schedule. Confirm the approved template arrives, then STOP REMINDERS and verify later messages stop. In development mode Meta's test-number recipient restrictions still apply.

## Patient flow

- HELLO → consent introduction → **Yes, continue** → menu.
- Check symptoms → a few focused replies → website next step. Health-question replies are short. AI replies are limited to four per rolling 24-hour allowance; navigation and reminder controls remain available afterward. Emergency guidance is not followed by an online-booking link.
- **More options → Medication reminders**, or type REMINDERS.
- Enter the medicine from the existing prescription/label → its existing dose → exact 24-hour WAT times separated by commas (1–6/day) → number of days (1–90, starting today).
- Review the saved drug, dose, times, frequency, duration, notification visibility, and separate reminder opt-in. Tap **Confirm reminders** or type CONFIRM REMINDERS. “Yes” alone does not activate medication reminders. CANCEL discards setup; STOP REMINDERS removes all saved schedules. Up to 10 active schedules per contact.
- Schedules use **Nigeria time, WAT/UTC+1**; other time zones and as-needed medication are not supported. The bot never calculates dosage, frequency, duration, or clock times from vague instructions. Patients must use their own clinician/pharmacist instructions and another reliable plan when reminders are unavailable.

Reminders are best-effort, not an alarm or adherence monitor. Jobs more than ten minutes late are skipped rather than sending a backlog of dose reminders. Failed sends retry at five-minute intervals, up to three attempts, then pause that schedule. API acceptance is not proof of delivery. A network loss after Meta accepts a send can still lead to a duplicate. Expired inactive schedules are purged seven days after their end when the scheduler next claims jobs. STOP REMINDERS removes them immediately; already accepted outbound messages cannot be recalled.

## Data and reporting

All new tables have RLS enabled with no browser policies and explicit access revocation from anon/authenticated roles. Only server service-role operations are allowed. Chat context remains separate from clinical records. Medication setup never goes to Gemini: drafts and the scheduled recipient/medicine/dose payload are encrypted with AES-256-GCM using the separate reminder key. Clock times, expiry, and operational state remain readable by the server for scheduling. Temporary reply receipts may contain the confirmation text; their original 24-hour cleanup rules apply. Drafts expire after 30 minutes; the participant's expired draft is removed when that contact next interacts. The privacy policy now describes these behaviors.

Analytics stores message IDs, HMAC conversation keys, event categories, and timestamps, without drug names, doses, phone numbers, symptom text, or message bodies. Admin receives aggregate JSON only. It shows:

- Distinct contacts (includes non-consenting introductions), distinct active users after consent, processed incoming messages, consented contacts.
- Users returning on two or more WAT dates, active user-days, messages per active user, daily active users for the last 14 WAT dates. The selected all/30/90-day period applies.
- Website links **offered**, not clicks or bookings; confirmed schedules; reminder messages **accepted by Meta**, failed attempts, and current active schedule snapshot.

Retries do not increase message or usage counts. Chat expiry and RESET do not erase aggregate usage history. WhatsApp people are not treated as new website signups or saved website triage reports. Pseudonymous consent and usage records persist for service operation/aggregate reporting; the privacy policy provides a contact for deletion requests. No historical backfill is claimed.

## Checks

`node scripts/test-whatsapp.cjs`, `node scripts/test-whatsapp-triage.cjs`, `node scripts/test-whatsapp-reminders.cjs`, `node scripts/test-traction.cjs`, and the TypeScript/production build.

Optional actual Postgres tests use a temporary PGlite installation (see WHATSAPP_SETUP.md): `node scripts/test-whatsapp-engagement-sql.cjs` and `node scripts/test-whatsapp-memory-sql.cjs`. They create an isolated local database, check RLS/permissions, consent, retry-safe counts, reminder leases/cancellation, and frequency/date definitions. They do not touch Supabase or send messages.
