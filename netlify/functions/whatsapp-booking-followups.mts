import {createClient} from '@supabase/supabase-js';
import {decryptReminder} from '../../app/lib/whatsapp-reminder-core';
export default async()=>{
  if(process.env.WHATSAPP_BOOKING_FOLLOWUPS_ENABLED?.trim().toLowerCase()!=='true')return;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.VITE_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const phone=process.env.WHATSAPP_PHONE_NUMBER_ID,token=process.env.WHATSAPP_ACCESS_TOKEN;
  if(!url||!key||!phone||!token)throw Error('Followup configuration missing');
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:jobs,error}=await db.rpc('whatsapp_claim_booking_followups');if(error)throw Error('Followup claim failed');
  for(const job of jobs||[]){
    const finish=async(outcome:string)=>{const r=await db.rpc('whatsapp_finish_booking_followup',{session_key:job.conversation_key,token:job.lease,outcome});if(r.error)throw Error('Followup state update failed');return r.data;};
    // A claimed job is attempted once, with no automatic retry after uncertain delivery.
    if(!await finish('check')){await finish('skipped');continue;}
    let accepted=false;
    try{
      const saved=decryptReminder(job.payload);if(!/^\d{5,20}$/.test(saved.to))throw Error('Invalid recipient');
      const response=await fetch(`https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_VERSION||'v24.0'}/${encodeURIComponent(phone)}/messages`,{
        method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
        body:JSON.stringify({messaging_product:'whatsapp',to:saved.to,type:'text',text:{preview_url:false,body:"Hi! Just checking in as you requested. Were you able to book a doctor, or would you like help with the next step?\n\nReply BOOK to choose a doctor and complete your booking, or HUMAN for assistance. Send STOP FOLLOWUPS to cancel booking check-ins."}}),signal:AbortSignal.timeout(10000)});
      const result=await response.json().catch(()=>null);accepted=response.ok&&!!result?.messages?.[0]?.id;
    }catch{ /* No recipient, health data or raw Meta errors in logs. */ }
    await finish(accepted?'accepted':'failed');
  }
};
export const config={schedule:'*/5 * * * *'};
