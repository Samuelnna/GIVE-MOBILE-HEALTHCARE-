import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { supabase } from '../src/supabaseClient';
import { useNotification } from '../contexts/NotificationContext';
import { listConsultationCalls, startConsultationCall, updateConsultationCall } from '../app/actions/calls';
import { VideoCallTarget } from '../utils/video';
import VideoCall from './VideoCall';

export interface CallManagerHandle { start: (target: VideoCallTarget) => void }
const CallManager = forwardRef<CallManagerHandle, { user: { id: string; name: string } }>(({ user }, ref) => {
  const [active, setActive] = useState<any>(null), [incoming, setIncoming] = useState<any>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const activeRef = useRef<any>(null), starting = useRef(false);
  const { addNotification } = useNotification();
  const token = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Please sign in again.');
    return session.access_token;
  };
  const activate = (call: any) => { activeRef.current = call; setActive(call); };
  useImperativeHandle(ref, () => ({ start: async target => {
    if (starting.current || activeRef.current) { addNotification('Call in progress', 'End your current call before starting another.', 'warning'); return; }
    starting.current = true;
    try {
      const result = await startConsultationCall(await token(), target.peerId, target.appointmentId, target.mode || 'video');
      if (!result.success) throw new Error(result.error);
      activate(result.call); setError('');
    } catch (error) { addNotification('Call unavailable', error instanceof Error ? error.message : 'Could not start call.', 'error'); }
    finally { starting.current = false; }
  } }));
  useEffect(() => {
    let stopped = false, fetching = false;
    const refresh = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const result = await listConsultationCalls(await token());
        if (stopped) return;
        if (!result.success) throw new Error(result.error);
        setError('');
        const calls = result.calls || [];
        const current = activeRef.current;
        if (current) {
          const updated = calls.find(c => c.id === current.id);
          if (updated && ['ended', 'declined'].includes(updated.status)) {
            activate(null); addNotification('Call ended', updated.status === 'declined' ? 'The recipient declined the call.' : 'The other participant ended the call.', 'info');
          } else if (updated?.status === 'ringing' && Date.now() - Date.parse(updated.created_at) > 60000) {
            activate(null); addNotification('No answer', 'The call was not answered. You can try again later.', 'warning');
            void updateConsultationCall(await token(), updated.id, 'ended');
          } else if (updated) activate(updated);
        }
        setIncoming(calls.find(c => c.callee_id === user.id && c.status === 'ringing' &&
          c.id !== activeRef.current?.id && Date.now() - Date.parse(c.created_at) < 60000) || null);
      } catch (error) { if (!stopped) setError(error instanceof Error ? error.message : 'Incoming calls are unavailable.'); }
      finally { fetching = false; }
    };
    void refresh();
    const channel = supabase.channel(`app_calls_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_sessions' }, refresh).subscribe();
    const interval = window.setInterval(refresh, 4000);
    window.addEventListener('focus', refresh);
    return () => { stopped = true; clearInterval(interval); window.removeEventListener('focus', refresh); void supabase.removeChannel(channel); };
  }, [user.id]);
  const change = async (call: any, status: 'accepted' | 'declined' | 'ended') => {
    setBusy(true);
    try {
      const result = await updateConsultationCall(await token(), call.id, status);
      if (!result.success) throw new Error(result.error);
      if (status === 'accepted') { activate(result.call); setIncoming(null); }
      else if (call.id === activeRef.current?.id) activate(null);
      else setIncoming(null);
    } catch (error) { addNotification('Call update failed', error instanceof Error ? error.message : 'Please retry.', 'error'); }
    finally { setBusy(false); }
  };
  return <>
    {error && <div role="status" className="fixed bottom-3 left-3 z-40 max-w-sm rounded-lg bg-amber-50 p-3 text-xs text-amber-900 shadow">{error}</div>}
    {incoming && !active && <div role="alertdialog" aria-label="Incoming call" className="fixed inset-0 z-[70] bg-slate-900/80 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 text-center space-y-5"><h2 className="text-xl font-bold">Incoming {incoming.mode} call</h2><p>{incoming.caller_name} is calling you.</p>
        <button disabled={busy} onClick={() => void change(incoming, 'accepted')} className="bg-green-600 text-white rounded-lg px-5 py-3 mr-3">Answer</button>
        <button disabled={busy} onClick={() => void change(incoming, 'declined')} className="bg-red-600 text-white rounded-lg px-5 py-3">Decline</button>
      </div></div>}
    {active?.status === 'ringing' && <div className="fixed inset-0 z-[70] bg-slate-900 text-white flex flex-col items-center justify-center gap-5"><h2 className="text-xl">Calling {active.callee_name}…</h2><p>Waiting for an answer.</p><button disabled={busy} onClick={() => void change(active, 'ended')} className="bg-red-600 rounded-lg px-5 py-3">Cancel call</button></div>}
    {active?.status === 'accepted' && <VideoCall participant={{ name: active.caller_id === user.id ? active.callee_name : active.caller_name, roomName: `MobileDoc-${active.id}`, mode: active.mode }}
      currentUserId={user.id} currentUserName={user.name} onEndCall={() => void change(active, 'ended')} />}
  </>;
});
CallManager.displayName = 'CallManager';
export default CallManager;
