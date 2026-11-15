# Booking language and optional check-in

## Available after deploying the code

- **Talk to a doctor** replaces **Find a doctor**. Older typed Find a doctor commands still work.
- Doctor assessments explain the real audio/video consultation benefit: discuss symptoms, ask questions and receive advice about treatment/next steps, including whether tests are needed.
- The stated fee is NGN 1,000. BOOK opens the existing secure website flow; it never claims to make an immediate appointment or take payment in WhatsApp.
- There are no promises of referral codes, medication discounts, nearby partner clinics, a ten-minute duration, immediate examination or guaranteed availability. Urgency must come from the assessment, not sales pressure.

## Enable the optional check-in

1. Run `whatsapp_booking_followups.sql` in Supabase SQL Editor after the existing engagement and support migrations. It is safe to run again. No live migration has been run by creating this file.
2. In Netlify add `WHATSAPP_BOOKING_FOLLOWUPS_ENABLED=true`, using the Production context and Functions scope (or all scopes). Keep the existing reminder encryption key unchanged.
3. Deploy. Confirm the scheduled function `whatsapp-booking-followups` is present; it checks every five minutes.

After a **routine** doctor recommendation, the assistant offers one optional check-in. The patient must reply **CHECK IN**. Normal AI consent does not automatically enrol anyone.

The message is attempted approximately six hours after that opt-in, at most one requested check-in per contact per seven days. It says:

> Hi! Just checking in as you requested. Were you able to book a doctor, or would you like help with the next step?
>
> Reply BOOK to choose a doctor and complete your booking, or HUMAN for assistance. Send STOP FOLLOWUPS to cancel booking check-ins.

Only a recent routine doctor offer can be confirmed; the offer expires after twelve hours. Urgent and emergency assessments never get a delayed check-in offer and cancel any pending one. They must not be encouraged to wait for an automated message.

## Suppression and delivery limits

- BOOK, a booking-start action, an explicit booked/opt-out message, RESET/BOT, a human-support request or STOP cancels pending check-ins. STOP FOLLOWUPS cancels booking check-ins without withdrawing ordinary AI consent or cancelling medication reminders.
- The worker checks current consent/consent epoch and suppresses requests while human support is open. Pending bot replies, recent session activity leases, expired offers and stale jobs are protected by database checks.
- This version uses free-text messages only inside a conservative **23-hour limit from the actual latest incoming message timestamp**. If the worker runs too late, it skips the check-in. It never sends outside that limit and does not fall back to an unapproved template.
- No new Meta template is needed for this within-window version. A follow-up intended for the next day or outside the customer-service window would require a separate approved-template implementation. Meta's policy describes the 24-hour customer-service window: https://business.whatsapp.com/policy
- There is one send attempt. An uncertain/failed delivery is not automatically retried. API acceptance does not prove patient delivery. An already in-flight message cannot be recalled after cancellation.
- Recipient payloads are encrypted with the existing server-only encryption key and cleared after a terminal outcome. Old attempted-job payloads are also purged during subsequent worker maintenance.
- A WhatsApp phone number is not treated as verified website identity. This implementation does **not** automatically inspect an unrelated website account's bookings. It suppresses after BOOK starts or the patient says they booked; someone booking independently without telling the bot could still get the neutral question. Do not claim the bot verified that the person has not booked.
- All existing support migrations must be present even if the support feature is temporarily disabled, because the suppression checks read its queue.

## Test

Use fictional routine-care input, obtain a doctor recommendation, and send CHECK IN. Confirm the opt-in response. Test STOP FOLLOWUPS, BOOK, HUMAN and STOP independently. Verify urgent/emergency recommendations contain no delayed offer. For delivery testing, use a future within-window job and check the actual patient-side WhatsApp message; do not change production timestamps casually.

Local regression scripts: `scripts/test-whatsapp-booking-followups.cjs`, `scripts/test-whatsapp-booking-followups-sql.cjs`, `scripts/test-whatsapp.cjs`, and `scripts/test-whatsapp-triage.cjs`. They use mocks or an isolated database and do not send live messages.
