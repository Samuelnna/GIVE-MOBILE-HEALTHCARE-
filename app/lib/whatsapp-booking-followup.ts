import 'server-only';
export function bookingFollowupsEnabled(){
  return process.env.WHATSAPP_BOOKING_FOLLOWUPS_ENABLED?.trim().toLowerCase()==='true' && /^[a-f0-9]{64}$/i.test(process.env.WHATSAPP_REMINDER_ENCRYPTION_KEY||'');
}
export const FOLLOWUP_OFFER='Would you like one WhatsApp booking check-in in about 6 hours? Reply CHECK IN to request it. This is optional; send STOP FOLLOWUPS to cancel.';
export const FOLLOWUP_TEXT="Hi! Just checking in as you requested. Were you able to book a doctor, or would you like help with the next step?\n\nReply BOOK to choose a doctor and complete your booking, or HUMAN for assistance. Send STOP FOLLOWUPS to cancel booking check-ins.";
export function followupCancellation(text:string){
  return /^(?:stop followups|stop follow-ups|no check[ -]?in|not interested|already booked|booked|i(?: have|'ve|\u2019ve)? (?:already )?booked(?: (?:a |the |my )?(?:doctor|consultation|appointment))?[.!]?)$/i.test(text.trim());
}
export function routineDoctorRecommendation(reply:string){return reply.startsWith('*Routine care*')&&reply.includes('*Talk to a doctor*');}
