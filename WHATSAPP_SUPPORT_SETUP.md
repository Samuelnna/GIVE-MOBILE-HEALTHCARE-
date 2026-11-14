# WhatsApp booking and human support

BOOK uses the existing website consultation flow. It does not collect payments in WhatsApp or create an appointment by itself. Patients follow the link, sign in, choose a doctor and consultation details, pay NGN 1,000 through the existing checkout, and finish booking. Existing server-side payment verification remains required. No new Meta template is needed for this customer-initiated reply.

## Enable the support inbox

1. Back up the database, then run `whatsapp_support_inbox.sql` in the Supabase SQL editor. If you already installed an earlier version of that file, run `whatsapp_support_staff_access.sql` instead to replace the old admin-only permission check. It requires the existing WhatsApp memory, engagement/reminders and conversation-flow migrations. It is safe to run again. Do not rerun old migrations afterwards.
2. In Netlify set `WHATSAPP_SUPPORT_ENABLED=true`. Keep the existing `WHATSAPP_REMINDER_ENCRYPTION_KEY` unchanged; the same server-only AES-GCM key encrypts support recipient details and messages. The Supabase service-role key and WhatsApp access token must remain configured on the server. Do not put any of these keys in public variables.
3. Deploy this code. In Netlify confirm the `whatsapp-support-cleanup` scheduled function is deployed; it runs hourly to delete messages older than 7 days and close inactive requests. Reads/writes also enforce cleanup.
4. Create a separate account for each support worker using their own work email and the normal site signup, or Supabase Authentication. Complete email verification and ensure their existing profile is active. Do not make the account an administrator. Edit the email and display name in `whatsapp_support_enrol_staff.sql`, then run it in the Supabase SQL editor as the owner to grant restricted support membership. It refuses to enrol admin accounts.
5. Staff sign in at **https://mobiledoc247.com/support** using their own credentials. The support workspace contains only the inbox and sign-out controls. It is separate from the admin dashboard, and admin accounts are explicitly denied by both the API and SQL function, even if someone adds an admin to the membership table. No public signup can grant support membership.
6. To revoke a worker, set their membership `active=false` using the example at the end of the enrolment SQL file. Revocation is checked on every API/SQL operation. Another authorised worker can claim their open requests. Signing out does not revoke membership.

## Patient experience

- Send **BOOK**, or choose **More options → Book consultation**, for the secure site booking link.
- Send **HUMAN**, or choose **More options → Talk to our team**. The bot explains what support is for and asks the patient to reply **YES SUPPORT** before sharing messages.
- After YES SUPPORT, the request enters the queue and AI replies pause. The patient sends their support question. Only messages sent after handoff are shown in the inbox; previous AI/health history is cleared, not copied to staff.
- The welcome acknowledges a queue, not an immediate connection. There is no claim that a staff member is online, no promised response time, and no charge for requesting support.
- **BOT**, **RESET**, or **START** closes the support request, clears its stored support transcript, and returns to AI. **STOP** also withdraws AI consent and cancels reminders. **STOP REMINDERS** continues to cancel reminders while support remains open.
- While support is open, even BOOK goes to the support inbox; the patient can send BOT first to use automatic booking help again.

## Operator experience

1. Sign in at **/support**, select a request, and click **Take over**. Only the assigned operator can read its messages or reply. Another operator cannot claim an assigned request.
2. Replies identify the sender as **MobileDoc support** and include the staff member's profile name. Support staff must not present themselves as doctors unless appropriately qualified.
3. Messages refresh every 15 seconds while the inbox is open. This version does not send staff alerts outside the dashboard; arrange coverage and keep the inbox open during support hours.
4. Free-text replies are allowed by this implementation only within 23 hours of the latest patient message. If the window is closed, wait for the patient to message again. No proactive support template is included.
5. **Accepted by WhatsApp** means API acceptance, not confirmed patient delivery. A failed or timed-out send can be uncertain; don't resend immediately. Refresh and check the conversation first. Outbound IDs prevent the same submission from being sent again, and the bot does not resume during a send.
6. **Close and resume AI** deletes this support transcript and resumes the assistant for the patient's next message. It does not send a separate closing WhatsApp message; send a closing reply before clicking Close if appropriate. A closed request cannot be read or replied to.

## Test before announcing support

Use fictional messages with two WhatsApp users and an enrolled support account:

1. BOOK produces the doctor page link and fee explanation. Complete a booking using the existing payment test process; never treat the chat response alone as a paid booking.
2. HUMAN alone does not create an inbox request; YES SUPPORT does.
3. Send a fictional support question. Confirm the bot stays silent, the queue shows the request, and Take over reveals only support messages.
4. Send an operator reply. Confirm the patient sees it in the same business WhatsApp conversation, clearly labelled support.
5. Verify a second operator cannot take an assigned request. Verify ordinary patient/professional logins and all admin logins cannot call the support endpoint. Verify revoking support membership blocks the next operation.
6. Test BOT, STOP REMINDERS, and STOP separately. Confirm the intended support/consent/reminder changes.

## Disable support

Close all open requests before setting `WHATSAPP_SUPPORT_ENABLED=false` and redeploying. Turning the flag off immediately routes messages through the ordinary bot again; it is not a pause button for an existing human conversation. Keep the SQL installed. No Meta permissions, live messages, database migrations, payment charges or deployment were performed by creating these local changes.
