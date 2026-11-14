import 'server-only';
import { encryptReminder } from './whatsapp-reminder-core';
import type { IncomingMessage } from './whatsapp';

export function supportEnabled() { return process.env.WHATSAPP_SUPPORT_ENABLED?.trim().toLowerCase() === 'true'; }
export function supportDisabledReason() {
  const value=process.env.WHATSAPP_SUPPORT_ENABLED?.trim().toLowerCase();
  if(!value) return 'The live server is missing WHATSAPP_SUPPORT_ENABLED. In the Netlify site serving this domain, set it to true for Production with Functions scope (or All scopes), then publish a new deploy.';
  if(value==='false') return 'The live server has WHATSAPP_SUPPORT_ENABLED set to false. Set the Production value to true in Netlify and publish a new deploy.';
  return 'The live server received an invalid WHATSAPP_SUPPORT_ENABLED value. Use only true, without quotation marks, then publish a new deploy.';
}
export function supportControl(text: string) {
  if (/^(?:human|support|talk to (?:a )?human|talk to (?:your |the |our )?team)$/i.test(text.trim())) return 'human';
  if (/^(?:bot|resume (?:ai|bot)|\/?reset|\/?start|new assessment)$/i.test(text.trim())) return 'bot';
  return null;
}
export function supportCapture(message: IncomingMessage) {
  return { support_payload: encryptReminder({ text: message.text }), support_at: new Date(message.timestamp).toISOString() };
}
export const SUPPORT_REQUEST = 'I can connect you with the MobileDoc support team for help with bookings, payments or using our services. Support staff are not necessarily doctors.\n\nReply YES SUPPORT to share your next messages with authorised staff. Earlier AI messages will not be shared. Messages in this support inbox are kept for up to 7 days. No payment is needed to request support.';
export const SUPPORT_WAITING = "Your support request is in the queue. The AI assistant is paused while you talk with our team. Please send a short description of what you need help with; avoid sharing private medical documents.\n\nA reply may take time. This is not an emergency service. Send BOT to return to the assistant, or STOP to withdraw consent and clear this support conversation.";
export const SUPPORT_UNAVAILABLE = 'Our WhatsApp support inbox is not available yet. Please visit https://mobiledoc247.com for help with our services. You can still ask me health questions here.';
export const BOOK_REPLY = '*Book a consultation*\n\nOpen https://mobiledoc247.com/?care=doctors to choose a doctor. Sign in or create an account, choose your consultation details, and pay the NGN 1,000 consultation fee through the secure checkout.\n\nYour booking is confirmed only after payment verification and the booking steps are complete. No charge or appointment has been made by sending BOOK.\n\nIf you want help choosing a doctor, tell me which type of care you need. For an emergency, seek immediate in-person care rather than waiting for a booking.';
