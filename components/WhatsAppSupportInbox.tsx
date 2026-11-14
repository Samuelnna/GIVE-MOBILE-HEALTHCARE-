'use client';
import React,{useCallback,useEffect,useState} from 'react';
import {supabase} from '../src/supabaseClient';
type Thread={conversation_key:string;status:string;assigned_to:string|null;requested_at:string;last_inbound_at:string};
type Message={id:string;direction:string;state:string;created_at:string;text:string};
export default function WhatsAppSupportInbox(){
  const [threads,setThreads]=useState<Thread[]>([]),[selected,setSelected]=useState<Thread|null>(null),[messages,setMessages]=useState<Message[]>([]),[messageThread,setMessageThread]=useState('');
  const [text,setText]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[staff,setStaff]=useState('');
  const api=useCallback(async(path='',body?:unknown)=>{
    const {data:{session}}=await supabase.auth.getSession();if(!session)throw Error('Please sign in again.');setStaff(session.user.id);
    const response=await fetch('/api/whatsapp/support'+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${session.access_token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store'});
    const result=await response.json();if(!response.ok)throw Error(result.error||'Could not load inbox');return result;
  },[]);
  const refresh=useCallback(async()=>{
    const result=await api();setThreads(result.threads);
    if(selected){const current=result.threads.find((t:Thread)=>t.conversation_key===selected.conversation_key);if(!current){setSelected(value=>value?.conversation_key===selected.conversation_key?null:value);setMessages([]);}else if(current.assigned_to===staff){const loaded=await api('?thread='+current.conversation_key);setMessages(loaded.messages);setMessageThread(current.conversation_key);}}
  },[api,selected,staff]);
  useEffect(()=>{let alive=true;const poll=()=>refresh().catch(e=>{if(alive)setError(e.message)});void poll();const timer=setInterval(poll,15000);return()=>{alive=false;clearInterval(timer)}},[refresh]);
  async function act(action:string){if(!selected)return;setBusy(true);setError('');try{
    await api('',{action,thread:selected.conversation_key,...(action==='reply'?{text,id:crypto.randomUUID()}:{})});
    if(action==='reply')setText('');
    if(action==='take'){const current={...selected,status:'active',assigned_to:staff};setSelected(current);setMessages((await api('?thread='+current.conversation_key)).messages);}
    if(action==='close'){setSelected(null);setMessages([]);}await refresh();
  }catch(e){setError(e instanceof Error?e.message:'Action failed');}finally{setBusy(false)}}
  return <div className="rounded-2xl border border-slate-200 bg-white p-5">
    <h2 className="text-xl font-bold">WhatsApp support inbox</h2><p className="mt-2 text-sm text-slate-600">Support for bookings, payments and using MobileDoc. Clinical questions belong with a qualified clinician. AI stays paused while a request is open.</p>
    {error&&<p role="alert" className="my-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
    <button className="my-3 rounded border px-3 py-2" onClick={()=>{setError('');void refresh().catch(e=>setError(e.message))}}>Refresh inbox</button>
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]"><div>{threads.length===0&&<p className="text-sm text-slate-500">No open support requests.</p>}{threads.map((t,i)=><button key={t.conversation_key} disabled={busy} className={`mb-2 w-full rounded-lg border p-3 text-left ${selected?.conversation_key===t.conversation_key?'border-emerald-500 bg-emerald-50':''}`} onClick={()=>{setSelected(t);setMessages([]);setMessageThread('');setText('');setError('')}}><strong>Support request {i+1}</strong><p className="text-sm">{t.status} {t.assigned_to?(t.assigned_to===staff?' - assigned to you':' - assigned to another staff member'):''}</p><p className="text-xs text-slate-500">{new Date(t.last_inbound_at).toLocaleString()}</p></button>)}</div>
    <div>{!selected?<p>Select a request to help a patient.</p>:<><p className="mb-3 text-sm">Only messages shared after the support request appear here. Closing clears this support transcript. The patient can also send BOT or STOP.</p>
      {selected.assigned_to!==staff?<button disabled={busy||!!selected.assigned_to} onClick={()=>void act('take')} className="rounded bg-emerald-700 p-3 text-white disabled:opacity-50">Take over</button>:<>
        <div className="max-h-96 space-y-3 overflow-auto rounded bg-slate-50 p-3">{(messageThread!==selected.conversation_key||messages.length===0)&&<p>No support messages yet. You may introduce yourself.</p>}{(messageThread===selected.conversation_key?messages:[]).map(m=><div key={m.id} className={`rounded border p-3 ${m.direction==='staff'?'bg-emerald-50':'bg-white'}`}><p className="mb-1 text-xs font-semibold">{m.direction==='staff'?'Support staff':'Patient'} - {new Date(m.created_at).toLocaleString()}</p><p className="whitespace-pre-wrap break-words">{m.text}</p>{m.direction==='staff'&&<p className="mt-1 text-xs">{m.state==='accepted'?'Accepted by WhatsApp; delivery not confirmed':m.state==='sending'?'Sending or awaiting confirmation; do not resend':m.state}</p>}</div>)}</div>
        <label className="mt-4 block font-semibold">Reply as support staff<textarea value={text} maxLength={2000} onChange={e=>setText(e.target.value)} className="mt-1 w-full rounded border p-3" rows={4}/></label>
        <p className="mb-2 text-xs text-slate-500">Replies need a patient message within the last 23 hours. Support is not a substitute for emergency care.</p>
        <div className="flex gap-3"><button disabled={busy||!text.trim()} onClick={()=>void act('reply')} className="rounded bg-emerald-700 px-4 py-2 text-white disabled:opacity-50">Send reply</button><button disabled={busy} onClick={()=>{if(window.confirm('Close this request and clear its support messages? The bot will answer the next patient message.'))void act('close')}} className="rounded border px-4 py-2">Close and resume AI</button></div>
      </>}
    </>}</div></div>
  </div>;
}
