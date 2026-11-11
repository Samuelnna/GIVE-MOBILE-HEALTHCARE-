import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { createHmac, randomUUID } from 'node:crypto';
import { generateWhatsAppReply, sendWhatsAppReply, type IncomingMessage, type TriageMessage } from './whatsapp';
import { menuReply, WHATSAPP_CONSENT, WHATSAPP_DECLINED, WHATSAPP_HANDOFF, WHATSAPP_WELCOME } from './whatsapp-menu';
import { reminderReady, reminderStep, REMINDER_START, REMINDER_UNAVAILABLE, encryptReminder, decryptReminder, nextReminderDue, type ReminderDraft } from './whatsapp-reminder-core';

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
    const { data, error } = await db.rpc('whatsapp_engagement_turn', {
      operation, session_key, inbound_id: message.id, lease_id, ...extra,
    });
    if (error) throw new Error(error.code === 'PGRST202' || error.code === '42P01' ? 'WHATSAPP_MEMORY_SETUP_REQUIRED' : 'WHATSAPP_MEMORY_FAILED');
    return data;
  };
  const control=/^(?:stop|forget me|no thanks)$/i.test(message.text.trim())||message.selection==='md_decline'?'stop':/^stop reminders$/i.test(message.text.trim())?'stop_reminders':null;
  const state = await turn('claim',control?{changes:{control}}:{});
  if (state?.state === 'sent') return;
  if (state?.state !== 'claimed') throw new Error('WHATSAPP_CONVERSATION_BUSY');
  try {
    let reply = typeof state.reply === 'string' ? state.reply : '';
    if (!reply) {
      const navigation = menuReply(message.text, message.selection);
      const history: TriageMessage[] = Array.isArray(state.history) ? state.history : [];
      const text = message.text.trim();
      let clear = false;
      const changes: Record<string, any> = {epoch:Number(state.epoch||0)};
      if (/^(?:stop|forget me)$/i.test(text) || message.selection==='md_decline' || /^no thanks$/i.test(text)) {
        reply=WHATSAPP_DECLINED; clear=true; changes.consent='revoke'; changes.stop_reminders=true; changes.wizard=null;
      } else if (/^stop reminders$/i.test(text)) {
        reply='All your medication reminders have been cancelled and their saved details removed. For care: https://mobiledoc247.com\n\nSend MENU for other options.';
        clear=true; changes.stop_reminders=true; changes.wizard=null;
      } else if (!state.consented) {
        clear=true;
        if (message.selection==='md_consent' || /^yes,? continue$/i.test(text)) {
          changes.consent='accept'; reply=WHATSAPP_WELCOME;
        } else reply=WHATSAPP_CONSENT;
      } else if (navigation?.reset) {
        reply=navigation.text+'\n\nYour existing reminders are unchanged. STOP REMINDERS cancels them.';
        clear=true; changes.wizard=null;
      } else if(message.selection==='md_consent'||/^yes,? continue$/i.test(text)) {
        reply=WHATSAPP_WELCOME;changes.wizard=null;
      } else if (navigation?.text==='REMINDER_SETUP' || /^(?:remind me|set (?:a )?reminder|reminders|medication reminders)$/i.test(text)) {
        clear=true;
        if (!reminderReady()) reply=REMINDER_UNAVAILABLE;
        else if (Number(state.reminder_count)>=10) reply='You already have 10 active medication reminders. STOP REMINDERS cancels them so you can create a new schedule. For support: https://mobiledoc247.com';
        else { changes.wizard=encryptReminder({step:'medicine'}); reply=REMINDER_START; }
      } else if (state.wizard && !navigation) {
        clear=true;
        if (!reminderReady()) { changes.wizard=null; reply=REMINDER_UNAVAILABLE; }
        else {
          const result=reminderStep(decryptReminder(state.wizard) as ReminderDraft,text);
          changes.wizard=result.draft ? encryptReminder(result.draft) : null;
          reply=result.reply;
          if(result.confirmed && result.draft) {
            const draft=result.draft, now=new Date(), wat=new Date(now.getTime()+3600000);
            const ends=new Date(Date.UTC(wat.getUTCFullYear(),wat.getUTCMonth(),wat.getUTCDate()+draft.days!)-3600000);
            const next=nextReminderDue(draft.times!,now,ends);
            if(!next) { reply='All selected times for today have passed. No reminder was saved. Send REMINDERS to choose another duration.'; changes.wizard=null; }
            else {
              changes.create_reminder={id:randomUUID(),payload:encryptReminder({to:message.from,medicine:draft.medicine,dose:draft.dose}),times:draft.times,ends_at:ends.toISOString(),next_due:next};
              changes.wizard=null;
            }
          }
        }
      } else if(!state.wizard && (/^(?:confirm reminders|cancel)$/i.test(text)||message.selection==='md_reminder_confirm'||message.selection==='md_reminder_cancel')) {
        reply='There is no active reminder setup to confirm or cancel. No new reminder was saved. Send REMINDERS to start, or STOP REMINDERS to remove existing schedules. For care: https://mobiledoc247.com';
      } else if (navigation) {
        reply=navigation.text; changes.wizard=null;
      } else if (Number(state.ai_turns)>=4) {
        reply=WHATSAPP_HANDOFF; changes.handoff=true;
      } else {
        reply=await generateWhatsAppReply(message.text,history);
        changes.ai_used=true;
        if(!/\b(?:Emergency care|emergency services|emergency department|seek immediate)\b/i.test(reply) && !reply.includes('https://mobiledoc247.com')) reply+='\n\nContinue your care: https://mobiledoc247.com';
      }
      if(reply.includes('https://mobiledoc247.com')) changes.handoff=true;
      await turn('prepare', { user_text: clear ? '[navigation or consent]' : message.text, reply_text: reply, clear_history: clear, changes });
    }
    await sendWhatsAppReply(message.from, message.id, reply);
    await turn('finish');
  } catch (error) {
    // Preserve any prepared answer for retry. Never discard context on a DB outage.
    try { await turn('release'); } catch { /* A lease also expires automatically. */ }
    throw error;
  }
}
