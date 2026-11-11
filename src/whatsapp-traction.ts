export interface WhatsAppTraction {
  trackingSince:string|null; contacts:number; users:number; messages:number; inboundMessages:number;
  repeatUsers:number; activeUserDays:number; messagesPerUser:number; consents:number; aiReplies:number;
  websiteHandoffs:number; remindersCreated:number; remindersSent:number; reminderFailures:number;
  remindersSkipped:number; activeReminders:number; daily:{date:string;users:number;messages:number}[];
}
export function whatsappMetrics(report:WhatsAppTraction) {
  return [
    ['WhatsApp active users',report.users,'Distinct WhatsApp contacts who used the bot after consent in the selected period; not website accounts.'],
    ['WhatsApp repeat users',report.repeatUsers,'Users active on at least two different WAT dates in the selected period.'],
    ['WhatsApp messages',report.messages,'Processed incoming messages after consent; webhook retries are counted once.'],
    ['WhatsApp messages per user',report.messagesPerUser,'Processed messages divided by active users in the selected period.'],
    ['WhatsApp active user-days',report.activeUserDays,'Sum of distinct active WAT days per user in the selected period.'],
    ['WhatsApp opted-in users',report.consents,'Distinct contacts who accepted the current consent text in this period.'],
    ['WhatsApp website links offered',report.websiteHandoffs,'Replies containing a website next step; not measured clicks or bookings.'],
    ['WhatsApp contacts reached',report.contacts,'Distinct incoming contacts, including people who have not consented.'],
    ['Medication reminders created',report.remindersCreated,'Confirmed reminder schedules created in this period.'],
    ['Medication reminders accepted by Meta',report.remindersSent,'Scheduled messages accepted by the API in this period; delivery/read/adherence is not inferred.'],
    ['Medication reminder send failures',report.reminderFailures,'Failed attempts in this period; one occurrence may have more than one failed attempt.'],
    ['Active medication reminders',report.activeReminders,'Current active, unexpired schedule snapshot, across all periods.'],
  ] as const;
}
