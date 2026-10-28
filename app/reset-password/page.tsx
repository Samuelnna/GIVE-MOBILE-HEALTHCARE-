'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../src/supabaseClient';

export default function ResetPassword() {
  const [ready, setReady] = useState(false), [password, setPassword] = useState(''), [confirm, setConfirm] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => { if (event === 'PASSWORD_RECOVERY' || session) setReady(true); });
    void supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => subscription.unsubscribe();
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8 || password !== confirm) { setMessage('Use at least 8 characters and make sure both passwords match.'); return; }
    setBusy(true); setMessage('');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setMessage(error.message); setBusy(false); return; }
    await supabase.auth.signOut(); setReady(false); setBusy(false); setMessage('Your password is updated. Return to the MobileDoc app to sign in.');
  }
  return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6"><div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 space-y-6"><a href="/" className="font-bold text-teal-700 text-xl">MobileDoc.</a><h1 className="text-3xl font-bold text-slate-900">A fresh start.</h1>{ready ? <form onSubmit={submit} className="space-y-5"><label className="block">New password<input className="block w-full border rounded-xl p-3 mt-2" type="password" autoComplete="new-password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required /></label><label className="block">Confirm new password<input className="block w-full border rounded-xl p-3 mt-2" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required /></label><button className="bg-teal-700 text-white rounded-xl p-4 w-full font-bold disabled:opacity-50" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button></form> : <p>Open the password recovery link from your email to choose a new password. If it has expired, request another link from the app’s sign-in screen.</p>}{message && <p role="status">{message}</p>}</div></main>;
}
