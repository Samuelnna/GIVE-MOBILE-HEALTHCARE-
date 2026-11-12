import { createClient } from '@supabase/supabase-js';
import { reminderReady, decryptReminder, nextReminderDue, formatReminderTimes } from './whatsapp-reminder-core';

export async function runMedicationReminders() {
  if(!reminderReady()) return {configured:false,accepted:0,failed:0,skipped:0};
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.VITE_SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token=process.env.WHATSAPP_ACCESS_TOKEN,phone=process.env.WHATSAPP_PHONE_NUMBER_ID;
  if(!url||!key||!token||!phone) throw new Error('REMINDER_CONFIG_MISSING');
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:jobs,error}=await db.rpc('whatsapp_claim_reminders',{batch_size:5});
  if(error) throw new Error('REMINDER_CLAIM_FAILED');
  const summary={configured:true,accepted:0,failed:0,skipped:0,errors:{} as Record<string,number>};
  const results=await Promise.allSettled((jobs||[]).map(async job=>{
    const now=new Date(),next=nextReminderDue(job.times,now,new Date(job.ends_at));
    const finish=async(outcome:string)=>{
      const {error}=await db.rpc('whatsapp_finish_reminder',{reminder_id:job.id,job_lease:job.lease,outcome,upcoming:next});
      if(error) throw new Error('REMINDER_FINISH_FAILED');
    };
    if(Date.parse(job.ends_at)<=now.getTime()||now.getTime()-Date.parse(job.next_due)>10*60000) {
      await finish('skipped'); summary.skipped++; return;
    }
    // Recheck revocation/cancellation after claiming and before contacting Meta.
    const [active,participant]=await Promise.all([
      db.from('whatsapp_medication_reminders').select('active').eq('id',job.id).eq('lease',job.lease).maybeSingle(),
      db.from('whatsapp_participants').select('consent_version').eq('conversation_key',job.conversation_key).maybeSingle(),
    ]);
    if(active.error||participant.error) throw new Error('REMINDER_RECHECK_FAILED');
    if(!active.data?.active||participant.data?.consent_version!=='2026-11-v1') { await finish('skipped'); summary.skipped++; return; }
    let stage:'decrypt'|'send'='decrypt';
    try {
      const saved=decryptReminder(job.payload);
      if(!/^\d{5,20}$/.test(saved.to)||typeof saved.medicine!=='string'||typeof saved.dose!=='string') throw new Error('REMINDER_DATA_INVALID');
      stage='send';
      const dueWAT=new Date(Date.parse(job.next_due)+3600000);
      const time=formatReminderTimes([dueWAT.getUTCHours()*60+dueWAT.getUTCMinutes()]);
      const response=await fetch(`https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_VERSION||'v24.0'}/${encodeURIComponent(phone)}/messages`,{
        method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify({messaging_product:'whatsapp',to:saved.to,type:'template',template:{name:process.env.WHATSAPP_REMINDER_TEMPLATE,
          language:{code:process.env.WHATSAPP_REMINDER_TEMPLATE_LANGUAGE},components:[{type:'body',parameters:[saved.medicine,saved.dose,time].map(text=>({type:'text',text}))}]}}),
        signal:AbortSignal.timeout(10000),
      });
      if(!response.ok) {
        // Meta's numeric codes identify template, language, token and account
        // failures. Do not log its raw body: it can echo recipient/payload data.
        const details=await response.json().catch(()=>null);
        const errorCode=Number.isSafeInteger(details?.error?.code)?details.error.code:0;
        const subcode=Number.isSafeInteger(details?.error?.error_subcode)?details.error.error_subcode:0;
        throw new Error(`REMINDER_META_HTTP_${response.status}_CODE_${errorCode}_SUBCODE_${subcode}`);
      }
      const body=await response.json();
      if(!body.messages?.[0]?.id) throw new Error('REMINDER_SEND_UNCONFIRMED');
    } catch(error) {
      const code=error instanceof Error && /^REMINDER_(?:META_HTTP_\d+_CODE_\d+_SUBCODE_\d+|DATA_INVALID|SEND_UNCONFIRMED)$/.test(error.message)
        ? error.message : stage==='decrypt'?'REMINDER_DECRYPT_FAILED':'REMINDER_NETWORK_FAILED';
      summary.errors[code]=(summary.errors[code]||0)+1;
      console.error('WhatsApp medication reminder failed',{code});
      await finish('failed'); summary.failed++; return;
    }
    // If this write fails after Meta accepts the send, leave the lease intact.
    // Exactly-once outbound delivery cannot be guaranteed across network failures.
    await finish('sent'); summary.accepted++;
  }));
  if(results.some(result=>result.status==='rejected')) throw new Error('REMINDER_BATCH_INCOMPLETE');
  return summary;
}
