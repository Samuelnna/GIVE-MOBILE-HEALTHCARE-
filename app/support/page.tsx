'use client';
import React,{useEffect,useState} from 'react';
import {supabase} from '../../src/supabaseClient';
import WhatsAppSupportInbox from '../../components/WhatsAppSupportInbox';

export default function SupportPage(){
  const [name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState('');
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[checking,setChecking]=useState(true);
  async function check(){
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){setName('');return;}
    const response=await fetch('/api/whatsapp/support?access=true',{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'});
    const result=await response.json();
    if(!response.ok){setName('');throw Error(result.error||'Support access could not be checked.');}
    setName(result.staff.name);
  }
  useEffect(()=>{void check().catch(e=>setError(e.message)).finally(()=>setChecking(false));
    const {data:{subscription}}=supabase.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){setName('');setPassword('');}});
    return()=>subscription.unsubscribe();
  },[]);
  async function login(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{
    const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;
    setPassword('');await check();
  }catch(e){setError(e instanceof Error?e.message:'Sign in failed');}finally{setBusy(false)}}
  async function logout(){setName('');setPassword('');setError('');await supabase.auth.signOut();localStorage.removeItem('currentUser');}
  return <main className="min-h-screen bg-slate-50 px-4 py-10"><div className={`mx-auto ${name?'max-w-6xl':'max-w-md'}`}>
    <header className="mb-6"><img src="/mobiledoclogo.jpeg" alt="MobileDoc" className="mb-4 h-20 w-20 rounded-xl object-contain"/><h1 className="text-2xl font-bold text-slate-900">MobileDoc support workspace</h1><p className="mt-2 text-sm text-slate-600">Help patients with bookings, payments and using our services.</p></header>
    {error&&<p role="alert" className="mb-4 rounded-lg bg-amber-50 p-3 text-amber-900">{error}</p>}
    {checking?<p>Checking support access...</p>:name?<><div className="mb-4 flex items-center justify-between gap-3"><p>Signed in as <strong>{name}</strong></p><button onClick={()=>void logout()} className="rounded border bg-white px-4 py-2">Sign out</button></div><WhatsAppSupportInbox/></>:<div className="rounded-2xl border bg-white p-6"><form onSubmit={login} className="space-y-4"><p className="text-sm text-slate-600">Use your authorised support staff account. Admin accounts do not have access.</p><label className="block text-sm font-semibold">Work email<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded-lg border p-3"/></label><label className="block text-sm font-semibold">Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full rounded-lg border p-3"/></label><button disabled={busy} className="w-full rounded-lg bg-emerald-700 p-3 font-semibold text-white disabled:opacity-50">{busy?'Signing in...':'Sign in to support'}</button></form><p className="mt-4 text-sm text-slate-500">Access is invitation only. Contact the MobileDoc owner if you need a support account.</p><button onClick={()=>void logout()} className="mt-3 text-sm underline">Clear current sign-in</button><p className="mt-3 text-sm text-slate-500">For a password reset, contact the MobileDoc owner.</p></div>}
  </div></main>;
}
