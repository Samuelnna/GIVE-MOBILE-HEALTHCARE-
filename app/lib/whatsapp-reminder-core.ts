import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export type ReminderDraft = { step: 'medicine' | 'dose' | 'times' | 'days' | 'confirm'; medicine?: string; dose?: string; times?: number[]; days?: number };
export const REMINDER_START = "Of course 😊 Let's set up a reminder for the medicine you're already taking.\n\nWhat is the medicine name? You can send CANCEL at any point.";
export const REMINDER_UNAVAILABLE = 'Medication reminders are not available yet. Please use another reliable reminder for now. For medication support, visit https://mobiledoc247.com\n\nSend MENU for other options.';
export function reminderReady() {
  return /^[a-f0-9]{64}$/i.test(process.env.WHATSAPP_REMINDER_ENCRYPTION_KEY || '') &&
    /^[a-z][a-z0-9_]+$/.test(process.env.WHATSAPP_REMINDER_TEMPLATE || '') && !!process.env.WHATSAPP_REMINDER_TEMPLATE_LANGUAGE;
}
function key() {
  const value = process.env.WHATSAPP_REMINDER_ENCRYPTION_KEY || '';
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error('WHATSAPP_REMINDER_KEY_MISSING');
  return Buffer.from(value, 'hex');
}
export function encryptReminder(value: unknown) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv);
  const content = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), content.toString('base64')].join('.');
}
export function decryptReminder(value: string): any {
  const [version, iv, tag, content] = value.split('.');
  if (version !== 'v1' || !iv || !tag || !content) throw new Error('WHATSAPP_REMINDER_DATA_INVALID');
  const cipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  cipher.setAuthTag(Buffer.from(tag, 'base64'));
  return JSON.parse(Buffer.concat([cipher.update(Buffer.from(content, 'base64')), cipher.final()]).toString('utf8'));
}
export const formatReminderTimes = (times: number[]) => times.map(time => `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`).join(', ');
export function parseReminderTimes(text: string): number[] | null {
  const normalized=text.normalize('NFKC')
    .replace(/\b(?:WAT|Nigeria(?:n)?(?:\s+time)?|West Africa(?:n)? time)\b/gi,' ')
    .replace(/\b(?:UTC|GMT)\s*\+\s*0?1(?::00)?\b/gi,' ')
    .replace(/([ap])\s*\.\s*m\.?/gi,'$1m')
    .replace(/\b(?:at|daily|every day|each day)\b/gi,' ')
    .replace(/\s*:\s*/g,':').trim().replace(/[.!]+$/,'').trim();
  const parts=normalized.split(/\s*(?:,|;|\band\b|&|\n|\/)\s*/i).map(part=>part.trim());
  if(!parts.length||parts.length>6||parts.some(part=>!part))return null;
  const values:number[]=[];
  for(const part of parts){
    if(/^(?:noon|midday)$/i.test(part)){values.push(720);continue;}
    if(/^midnight$/i.test(part)){values.push(0);continue;}
    const match=/^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?$/i.exec(part);
    if(!match||(!match[2]&&!match[3]))return null;
    let hour=Number(match[1]);const minutes=Number(match[2]||0),period=match[3]?.toLowerCase();
    if(minutes>59||hour>(period?12:23)||(period&&hour<1))return null;
    if(period)hour=hour%12+(period==='pm'?12:0);
    values.push(hour*60+minutes);
  }
  if (new Set(values).size !== values.length) return null;
  return values.sort((a, b) => a - b);
}
// WAT has a fixed UTC+1 offset. We never invent clock times from a frequency.
export function nextReminderDue(times: number[], after: Date, endsAt: Date): string | null {
  const shifted = new Date(after.getTime() + 3600000);
  const midnight = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - 3600000;
  for (let day = 0; day < 2; day++) for (const time of [...times].sort((a, b) => a - b)) {
    const candidate = midnight + day * 86400000 + time * 60000;
    if (candidate > after.getTime() && candidate < endsAt.getTime()) return new Date(candidate).toISOString();
  }
  return null;
}
export function reminderStep(draft: ReminderDraft, input: string): { draft: ReminderDraft | null; reply: string; confirmed?: boolean } {
  const text = input.trim();
  if (/^(?:cancel|menu)$/i.test(text)) return { draft: null, reply: "No problem 😊 I've cancelled this reminder setup. What else can I help you with?" };
  if (draft.step === 'medicine') {
    if (text.length < 2 || text.length > 100 || /[\r\n]/.test(text)) return { draft, reply: 'Please enter just the medicine name, up to 100 characters. Copy it from your prescription or label.' };
    return { draft: { step: 'dose', medicine: text }, reply: 'Thanks! What dose do you take? Please copy the amount and unit from your prescription or medicine label.' };
  }
  if (draft.step === 'dose') {
    if (text.length < 2 || text.length > 100 || /[\r\n]/.test(text)) return { draft, reply: 'Please copy the dose from your prescription or label, up to 100 characters. Ask your clinician or pharmacist if you are unsure.' };
    return { draft: { ...draft, step: 'times', dose: text }, reply: "What time or times would you like a reminder? You can say ‘8am and 6pm’ or ‘08:00, 18:00’. I'll use Nigeria time (WAT). Please use the schedule you were given." };
  }
  if (draft.step === 'times') {
    const times = parseReminderTimes(text);
    if (!times) return { draft, reply: "I didn't quite catch the times. You can write ‘8am and 6pm’ or ‘08:00, 18:00’ (Nigeria time). What clock times are on your schedule?" };
    return { draft: { ...draft, step: 'days', times }, reply: `Got it — ${formatReminderTimes(times)} WAT 😊\n\nFor how many days would you like these reminders, starting today? For example, ‘7 days’. Use the duration you were given.` };
  }
  if (draft.step === 'days') {
    const duration=/^(?:for\s+)?(\d{1,3})\s*(days?|weeks?)?[.!]?$/i.exec(text);
    const days=duration?Number(duration[1])*(/^weeks?$/i.test(duration[2]||'')?7:1):0;
    if(days<1||days>90) return { draft, reply: 'How many days should I set? You can say ‘7 days’ or ‘2 weeks’, up to 90 days. Please use the duration you were given.' };
    const updated: ReminderDraft = { ...draft, step: 'confirm', days };
    return { draft: updated, reply: `*Confirm your reminder*\nMedicine: ${draft.medicine}\nDose: ${draft.dose}\nTimes: ${formatReminderTimes(draft.times!)} WAT (${draft.times!.length} per day)\nDuration: ${days} days, starting today.\n\nDoes that look right? Tap *Confirm reminders* to agree to receive this schedule on WhatsApp, or Cancel setup to change it. Details may appear in notifications. Reminders can be delayed, so keep following your prescription.\n\nSTOP REMINDERS cancels your reminders later.` };
  }
  if (!/^confirm reminders$/i.test(text)) return { draft, reply: 'Almost there 😊 Tap Confirm reminders (or type CONFIRM REMINDERS) to agree to receive this schedule. You can also send CANCEL to start again.' };
  return { draft, confirmed: true, reply: `All set 😊 Your reminder is saved!\n\n${draft.medicine} — ${draft.dose}\n${formatReminderTimes(draft.times!)} WAT, for ${draft.days} days. I'll start with the next upcoming time.\n\nSend STOP REMINDERS whenever you'd like to cancel.` };
}
