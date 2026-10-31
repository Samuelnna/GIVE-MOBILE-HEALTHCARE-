# WhatsApp + Gemini text demo

The webhook is `/api/whatsapp/webhook`. It receives signed WhatsApp text messages, generates a single-turn Gemini answer, and replies to the sender. It has no access to patient data, bookings, or payments. It does not store conversation text or conversation history.

Required server environment variables: `GEMINI_API_KEY`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`. Never prefix these with NEXT_PUBLIC or commit their values. Optional: `WHATSAPP_GEMINI_MODEL` (default `gemini-2.5-flash`), `WHATSAPP_GRAPH_VERSION` (default `v24.0`).

1. Run `npm run dev` in this repository. Restart it after changing environment variables.
2. Expose the local port through an HTTPS development tunnel, or deploy the changes and configure the same environment variables on the host. A localhost URL cannot receive Meta's webhook.
3. In Meta's WhatsApp configuration, set the callback URL to `https://YOUR-PUBLIC-HOST/api/whatsapp/webhook` and the verify token to the exact value of WHATSAPP_VERIFY_TOKEN. Verify and save, then subscribe to the `messages` webhook field. The app must also be subscribed to the intended WhatsApp Business Account.
4. From your verified test-recipient phone, send a text to Meta's test WhatsApp number. Text is supported; receipts and media are ignored. Temporary Meta access tokens expire and must be refreshed for testing; use a suitable system-user token for ongoing operation.

GET echoes Meta's challenge only with the correct token. POST verifies X-Hub-Signature-256 using the raw body and app secret, and filters to the configured phone-number ID. Failed generation/delivery returns 503 for retry. Logs contain error codes only, never tokens, message contents, or sender numbers.

This is a development demo, not a production automation service. Deduplication is in memory for 24 hours, limited to one server process; restarts or multiple instances can send duplicate replies. Sending cannot be made exactly-once if the remote API accepted a message but the connection was lost. Before public use, add a durable inbox/queue with a shared message-ID constraint, fast webhook acknowledgement, bounded retries, and rate limits. The current synchronous webhook can take up to 25 seconds per batch and may receive retries while processing. No messages are sent merely by configuring or verifying the endpoint.

Checks: `node scripts/test-whatsapp.cjs` and `node node_modules/typescript/bin/tsc --noEmit --incremental false`.
