import { runMedicationReminders } from '../../app/lib/whatsapp-reminder-worker';

export default async () => {
  try {
    const result=await runMedicationReminders();
    if(result.configured) console.log('WhatsApp reminder batch',JSON.stringify(result));
    return new Response(JSON.stringify(result),{status:200});
  } catch {
    console.error('WhatsApp reminder batch failed; inspect configuration and database setup.');
    return new Response('Reminder batch failed',{status:503});
  }
};
export const config={schedule:'* * * * *'};
