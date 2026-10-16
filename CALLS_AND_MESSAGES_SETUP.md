# Calls and live messages

Run `call_sessions.sql` in Supabase SQL Editor, after the paid-messaging SQL and ambiguity fix. Restart localhost. This creates participant-only call records, enables Realtime publication for calls/messages, and reserves call writes for authorized server actions. Existing messages and payments are not deleted.

Calls now ring across the signed-in app, including outside Messaging. Invitations expire after 60 seconds; recipients answer or decline; either participant can hang up. Calls use verified messaging access, and appointment calls additionally require an accepted (Upcoming) appointment. Both parties use a random call-specific shared room. Voice calls join with video muted and audio-only configuration.

Realtime delivers updates; four-second call polling and five-second visible-chat polling provide fallback. The message subscription now updates the currently selected conversation instead of a stale React closure. Draft conversations remain available while message history refreshes.

The app must remain open and signed in. Closed browsers and suspended mobile apps do not receive guaranteed incoming calls. This implementation has no push service, native call integration, or durable background notification worker. A ringing prompt does not prove the person is online. The fallback polling adds database/auth traffic and should be tuned with production usage.

Media remains hosted by Jitsi. The public meet.jit.si service can require an authenticated host: https://jitsi.org/blog/authentication-on-meet-jit-si/. Call signaling cannot remove that requirement or resolve every firewall/media issue. `NEXT_PUBLIC_JITSI_DOMAIN` can point to your own HTTPS Jitsi host; restart/rebuild after changing it. A host requiring JWT needs a separate server-token integration before use. The public room URL is a bearer invitation; app access checks do not authenticate users to the external media service. For production private consultations, use an authenticated managed conferencing deployment or your own authenticated Jitsi deployment before launch.

Allow microphone/camera access on both devices. A phone opening `http://192.168...` is not localhost and usually cannot access media; use HTTPS. Device permission failures, conference errors, and slow joining now show feedback. A same-room external-tab link is provided for embedded-browser problems.

Test using two different accounts in separate browser profiles/devices: successful paid consultation; unpaid denial; ring while recipient is on Dashboard; answer/decline/cancel; expiry; hangup on both ends; voice with camera off; video with both participants visible and audible; blocked permissions; incoming messages in an already open chat; and updates after returning to the tab. Check both desktop and mobile networks. Automated tests mock auth/database access; real audio/video and browser behavior still require this two-device test.
