import { NextRequest, NextResponse } from 'next/server';
import { checkoutUser, paymentClient } from '../../../lib/consultation-checkout';
import { supportEnabled, supportDisabledReason } from '../../../lib/whatsapp-support';
import { decryptReminder, encryptReminder } from '../../../lib/whatsapp-reminder-core';
import { sendWhatsAppReply } from '../../../lib/whatsapp';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handle(request: NextRequest) {
  const json = (body: unknown, status=200) => NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return json({error:'Sign in required'},401);
    let user;
    try { user=await checkoutUser(token); } catch { return json({error:'Sign in required'},401); }
    const db=paymentClient();
    const {data:profile,error}=await db.from('profiles').select('user_type,status,full_name').eq('id',user.id).maybeSingle();
    if(error||!profile||profile.user_type==='admin'||profile.status!=='active') return json({error:'An authorised support staff account is required. Administrator accounts cannot use this inbox.'},403);
    const {data:member,error:memberError}=await db.from('whatsapp_support_staff_members').select('display_name,active').eq('user_id',user.id).maybeSingle();
    if(memberError||!member?.active) return json({error:'An authorised support staff account is required.'},403);
    if(request.method==='GET'&&request.nextUrl.searchParams.get('access')==='true') return json({staff:{name:member.display_name}});
    if(!supportEnabled()) return json({error:supportDisabledReason()},503);
    const rpc=async(action:string, key?:string,extra:Record<string,unknown>={})=>{
      const {data,error}=await db.rpc('whatsapp_support_staff',{action,actor:user.id,thread_key:key||null,...extra});
      if(error) throw new Error(error.code==='PGRST202'?'Support SQL setup is missing.': 'Support action unavailable. Refresh the inbox; check assignment, reply window or delivery in progress.');
      return data;
    };
    if(request.method==='GET') {
      const key=request.nextUrl.searchParams.get('thread');
      if(!key) return json({threads:await rpc('list')});
      if(!/^[a-f0-9]{64}$/.test(key)) return json({error:'Invalid thread'},400);
      const rows=await rpc('read',key);
      return json({messages:rows.map((r:any)=>({id:r.id,direction:r.direction,state:r.state,created_at:r.created_at,text:decryptReminder(r.payload).text})).reverse()});
    }
    if(Number(request.headers.get('content-length')||0)>16384) return json({error:'Request too large'},413);
    const raw=await request.text(); if(Buffer.byteLength(raw)>16384) return json({error:'Request too large'},413);
    const body=JSON.parse(raw),key=body.thread;
    if(typeof key!=='string'||!/^[a-f0-9]{64}$/.test(key)) return json({error:'Invalid thread'},400);
    if(['take','close'].includes(body.action)) {await rpc(body.action,key);return json({ok:true});}
    if(body.action!=='reply'||typeof body.text!=='string'||!body.text.trim()||body.text.length>2000||!/^[-a-f0-9]{36}$/i.test(body.id||'')) return json({error:'Invalid reply'},400);
    const staffName=String(member.display_name||'MobileDoc team').replace(/[\r\n*_~`]/g,' ').slice(0,60);
    const text=`MobileDoc support - ${staffName}\n\n${body.text.trim()}\n\nSend BOT to return to the AI assistant.`;
    const reserve=await rpc('reserve',key,{outbound_id:body.id,encrypted_body:encryptReminder({text})});
    try {
      const recipient=decryptReminder(reserve.recipient);
      if(!/^\d{5,20}$/.test(recipient.to)) throw new Error('Invalid recipient');
      await sendWhatsAppReply(recipient.to,reserve.inbound,text);
    } catch {
      await rpc('uncertain',key,{outbound_id:body.id});
      return json({error:'Delivery could not be confirmed. Do not resend immediately; check the conversation first.'},502);
    }
    await rpc('accepted',key,{outbound_id:body.id});
    return json({ok:true});
  } catch(error) {
    // Never include payloads, recipient numbers, tokens or raw provider responses.
    const message=error instanceof Error && error.message.startsWith('Support ')?error.message:'Support request failed. Refresh before trying again.';
    return json({error:message},400);
  }
}
export const GET=handle;
export const POST=handle;
