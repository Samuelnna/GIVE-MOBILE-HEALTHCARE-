import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export type ReminderDraft = { step: 'medicine' | 'dose' | 'times' | 'days' | 'confirm'; medicine?: string; dose?: string; times?: number[]; days?: number };
export const REMINDER_START = 'I can repeat the medication schedule you already have; I cannot choose a drug or dose. Times are in Nigeria time (WAT, UTC+1). Send CANCEL to exit.\n\nWhat is the medicine name?';
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
  const parts = text.trim().split(/\s*,\s*/);
  if (!parts.length || parts.length > 6 || parts.some(part => !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(part))) return null;
  const values = parts.map(part => Number(part.slice(0, 2)) * 60 + Number(part.slice(3)));
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
  if (/^(?:cancel|menu)$/i.test(text)) return { draft: null, reply: 'Reminder setup cancelled. Visit https://mobiledoc247.com for care, or send MENU.' };
  if (draft.step === 'medicine') {
    if (text.length < 2 || text.length > 100 || /[\r\n]/.test(text)) return { draft, reply: 'Please enter just the medicine name, up to 100 characters. Copy it from your prescription or label.' };
    return { draft: { step: 'dose', medicine: text }, reply: 'What dose does your existing prescription or label say? Copy it exactly, including the amount/unit. I will not calculate or recommend a dose.' };
  }
  if (draft.step === 'dose') {
    if (text.length < 2 || text.length > 100 || /[\r\n]/.test(text)) return { draft, reply: 'Please copy the dose from your prescription or label, up to 100 characters. Ask your clinician or pharmacist if you are unsure.' };
    return { draft: { ...draft, step: 'times', dose: text }, reply: 'At what exact times should I remind you? Use 24-hour WAT times separated by commas, e.g. 08:00, 20:00. Enter only times that match your existing instructions (maximum 6 per day).' };
  }
  if (draft.step === 'times') {
    const times = parseReminderTimes(text);
    if (!times) return { draft, reply: 'Please enter exact 24-hour times, e.g. 08:00, 20:00. I cannot turn “twice a day” into a safe medication schedule for you. Check your existing instructions.' };
    return { draft: { ...draft, step: 'days', times }, reply: 'For how many days should these reminders run, starting today? Enter a whole number from 1 to 90, matching the duration you were given.' };
  }
  if (draft.step === 'days') {
    if (!/^\d{1,2}$/.test(text) || Number(text) < 1 || Number(text) > 90) return { draft, reply: 'Enter a whole number from 1 to 90 days. I cannot decide how long you should take a medicine.' };
    const updated: ReminderDraft = { ...draft, step: 'confirm', days: Number(text) };
    return { draft: updated, reply: `*Confirm your reminder*\nMedicine: ${draft.medicine}\nSaved dose: ${draft.dose}\nTimes: ${formatReminderTimes(draft.times!)} WAT (${draft.times!.length} per day)\nDuration: ${text} days, starting today.\n\nI will only repeat what you entered. Details may appear in notifications. Reminders can be delayed; follow your prescription, not the notification alone.\n\nReply CONFIRM REMINDERS to agree to this schedule and receive scheduled WhatsApp messages. Reply CANCEL to discard it. STOP REMINDERS cancels all reminders later.` };
  }
  if (!/^confirm reminders$/i.test(text)) return { draft, reply: 'Reply CONFIRM REMINDERS to agree to receive this schedule, or CANCEL to discard it. I will not activate it without your confirmation.' };
  return { draft, confirmed: true, reply: `Reminder saved: ${draft.medicine}, ${draft.dose}, at ${formatReminderTimes(draft.times!)} WAT for ${draft.days} days. Only future times will be sent.\n\nSTOP REMINDERS cancels all reminders. For medication questions: https://mobiledoc247.com` };
}
