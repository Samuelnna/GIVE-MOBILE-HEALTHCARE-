import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

export function validWhatsAppSignature(body: string, signature: string, secret: string) {
  if (!secret || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature.slice(7), 'hex'));
}

type IncomingMessage = { id: string; from: string; text: string; timestamp: number };
export function incomingWhatsAppMessages(payload: any, phoneId: string): IncomingMessage[] {
  const result: IncomingMessage[] = [];
  if (payload?.object !== 'whatsapp_business_account') return result;
  for (const entry of Array.isArray(payload.entry) ? payload.entry : []) {
    for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
      const value = change?.value;
      if (change?.field !== 'messages' || value?.metadata?.phone_number_id !== phoneId) continue;
      for (const message of Array.isArray(value.messages) ? value.messages : []) {
        if (message?.type !== 'text' || typeof message.id !== 'string' || !message.id ||
            !/^\d{5,20}$/.test(message.from) || typeof message.text?.body !== 'string' || !message.text.body.trim()) continue;
        const timestamp = Number(message.timestamp) * 1000;
        // Only reply inside the customer-initiated conversation window.
        if (!Number.isFinite(timestamp) || timestamp > Date.now() + 300000 || Date.now() - timestamp >= 23 * 3600000) continue;
        result.push({ id: message.id, from: message.from, text: message.text.body.slice(0, 4000), timestamp });
      }
    }
  }
  return result;
}

// Demo-only deduplication. Production workers need a durable inbox/queue shared
// between instances. This cache contains message IDs, not conversation contents.
const deliveries = new Map<string, { expires: number; pending: Promise<void> }>();
export async function oncePerWhatsAppMessage(id: string, work: () => Promise<void>) {
  for (const [key, entry] of deliveries) if (entry.expires < Date.now()) deliveries.delete(key);
  const existing = deliveries.get(id);
  if (existing) return existing.pending;
  if (deliveries.size >= 2000) throw new Error('WHATSAPP_DEMO_CAPACITY');
  const pending = Promise.resolve().then(work);
  deliveries.set(id, { expires: Date.now() + 86400000, pending });
  try { await pending; } catch (error) { deliveries.delete(id); throw error; }
}

export async function generateWhatsAppReply(text: string) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error('GEMINI_NOT_CONFIGURED');
  const model = process.env.WHATSAPP_GEMINI_MODEL || 'gemini-2.5-flash';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: 'You are a helpful AI assistant replying to a WhatsApp text message. Keep answers short, clear and friendly. Match the user\'s language. This is a standalone demo: you have no access to accounts, records, bookings, payments, or tools. Never claim to have performed actions. Do not ask for passwords, payment credentials, or medical records. For medical questions, give general information only, do not diagnose or prescribe, and suggest a qualified clinician for individual advice.' }] },
      contents: [{ role: 'user', parts: [{ text }] }],
      generationConfig: { maxOutputTokens: 600, temperature: 0.4, thinkingConfig: { thinkingBudget: 0 } },
    }), signal: AbortSignal.timeout(15000), cache: 'no-store',
  });
  if (!response.ok) throw new Error(`GEMINI_HTTP_${response.status}`);
  const body = await response.json();
  const reply = body.candidates?.[0]?.content?.parts?.filter((part: any) => !part.thought && typeof part.text === 'string')
    .map((part: any) => part.text).join('\n').trim();
  return (reply || 'I could not generate an answer to that message. Please try rephrasing it.').slice(0, 4000);
}

export async function sendWhatsAppReply(to: string, messageId: string, text: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim(), phone = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!token || !phone) throw new Error('WHATSAPP_NOT_CONFIGURED');
  const version = process.env.WHATSAPP_GRAPH_VERSION || 'v24.0';
  const response = await fetch(`https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(phone)}/messages`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, context: { message_id: messageId },
      type: 'text', text: { preview_url: false, body: text.slice(0, 4000) } }),
    signal: AbortSignal.timeout(10000), cache: 'no-store',
  });
  if (!response.ok) throw new Error(`WHATSAPP_HTTP_${response.status}`);
}
