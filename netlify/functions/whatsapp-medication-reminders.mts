import { runMedicationReminders } from '../../app/lib/whatsapp-reminder-worker';

export default async () => {
  try {
    const result=await runMedicationReminders();
    console.log(
      result.configured
        ? `WhatsApp reminder batch ${JSON.stringify(result)}`
        : 'WhatsApp reminder batch is not configured'
    );
    return new Response(JSON.stringify(result),{status:200});
  } catch (error) {
    const code = error instanceof Error && /^[A-Z0-9_]{1,120}$/.test(error.message)
      ? error.message
      : 'REMINDER_BATCH_FAILED';
    console.error('WhatsApp reminder batch failed:', code);
    return new Response('Reminder batch failed',{status:503});
  }
};
export const config={schedule:'* * * * *'};
