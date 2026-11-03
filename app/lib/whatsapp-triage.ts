import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { createHmac, randomUUID } from 'node:crypto';
import { generateWhatsAppReply, sendWhatsAppReply, type IncomingMessage, type TriageMessage } from './whatsapp';
import { menuReply, WHATSAPP_PRIVACY_NOTICE } from './whatsapp-menu';

export function whatsappConversationKey(sender: string) {
  const secret = process.env.WHATSAPP_APP_SECRET?.trim(), phone = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!secret || !phone) throw new Error('WHATSAPP_NOT_CONFIGURED');
  return createHmac('sha256', secret).update(`${phone}:${sender}`).digest('hex');
}

function memoryClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('WHATSAPP_MEMORY_NOT_CONFIGURED');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function handleWhatsAppTriage(message: IncomingMessage) {
  const db = memoryClient(), session_key = whatsappConversationKey(message.from), lease_id = randomUUID();
  const turn = async (operation: string, extra: Record<string, unknown> = {}) => {
    const { data, error } = await db.rpc('whatsapp_triage_turn', {
      operation, session_key, inbound_id: message.id, lease_id, ...extra,
    });
    if (error) throw new Error(error.code === 'PGRST202' || error.code === '42P01' ? 'WHATSAPP_MEMORY_SETUP_REQUIRED' : 'WHATSAPP_MEMORY_FAILED');
    return data;
  };
  const state = await turn('claim');
  if (state?.state === 'sent') return;
  if (state?.state !== 'claimed') throw new Error('WHATSAPP_CONVERSATION_BUSY');
  try {
    let reply = typeof state.reply === 'string' ? state.reply : '';
    if (!reply) {
      const navigation = menuReply(message.text, message.selection);
      const history: TriageMessage[] = Array.isArray(state.history) ? state.history : [];
      reply = navigation?.text || await generateWhatsAppReply(message.text, history);
      if (!history.length || navigation?.reset) reply += '\n\n' + WHATSAPP_PRIVACY_NOTICE;
      await turn('prepare', { user_text: message.text, reply_text: reply, clear_history: navigation?.reset || false });
    }
    await sendWhatsAppReply(message.from, message.id, reply);
    await turn('finish');
  } catch (error) {
    // Preserve any prepared answer for retry. Never discard context on a DB outage.
    try { await turn('release'); } catch { /* A lease also expires automatically. */ }
    throw error;
  }
}
