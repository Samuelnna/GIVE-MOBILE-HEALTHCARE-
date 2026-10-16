'use server';
import { createClient } from '@supabase/supabase-js';
import { checkoutUser, paymentClient } from '../lib/consultation-checkout';

async function permitted(token: string, sender: string, receiver: string) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  const { data, error } = await db.rpc('can_message_participants', { message_sender: sender, message_receiver: receiver });
  if (error) throw new Error(`Could not check call access: ${error.message}`);
  if (data !== true) throw new Error('A verified consultation payment for this professional is required before calling.');
}

export async function startConsultationCall(token: string, peerId?: string, appointmentId?: string | number, mode: 'audio' | 'video' = 'video') {
  try {
    const user = await checkoutUser(token), db = paymentClient();
    if (mode !== 'audio' && mode !== 'video') throw new Error('Invalid call type.');
    if (appointmentId) {
      const { data: appointment, error } = await db.from('appointments').select('*').eq('id', appointmentId).single();
      if (error || !appointment || ![appointment.patient_id, appointment.doctor_id].includes(user.id)) throw new Error('Appointment could not be verified.');
      if (appointment.status !== 'Upcoming') throw new Error('The professional must accept this appointment before calling from it.');
      peerId = user.id === appointment.patient_id ? appointment.doctor_id : appointment.patient_id;
    }
    if (!peerId || peerId === user.id) throw new Error('Select another person to call.');
    await permitted(token, user.id, peerId);
    const { data: profiles, error: profileError } = await db.from('profiles').select('id, full_name').in('id', [user.id, peerId]);
    if (profileError || profiles?.length !== 2) throw new Error('Call participant profiles could not be loaded.');
    const { data, error } = await db.from('call_sessions').insert({ caller_id: user.id, callee_id: peerId,
      caller_name: profiles.find(p => p.id === user.id)?.full_name || 'Caller',
      callee_name: profiles.find(p => p.id === peerId)?.full_name || 'Recipient', mode,
    }).select('*').single();
    if (error) throw new Error(`Could not start call: ${error.message}`);
    return { success: true, call: data };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Could not start call.' }; }
}

export async function listConsultationCalls(token: string) {
  try {
    const user = await checkoutUser(token);
    const { data, error } = await paymentClient().from('call_sessions').select('*')
      .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false }).limit(30);
    if (error) throw new Error(`Could not receive calls: ${error.message}`);
    return { success: true, calls: data || [] };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Could not receive calls.' }; }
}

export async function updateConsultationCall(token: string, id: string, status: 'accepted' | 'declined' | 'ended') {
  try {
    const user = await checkoutUser(token), db = paymentClient();
    const { data: call, error } = await db.from('call_sessions').select('*').eq('id', id).single();
    if (error || !call || ![call.caller_id, call.callee_id].includes(user.id)) throw new Error('This call is not available to your account.');
    if (!['accepted', 'declined', 'ended'].includes(status)) throw new Error('Invalid call status.');
    if (status !== 'ended' && (call.callee_id !== user.id || call.status !== 'ringing')) throw new Error('Only the recipient can answer or decline a ringing call.');
    if (status === 'accepted') {
      if (Date.now() - Date.parse(call.created_at) > 60000) throw new Error('This call has expired. Ask the caller to try again.');
      await permitted(token, call.caller_id, call.callee_id);
    }
    const { data, error: updateError } = await db.from('call_sessions').update({ status, updated_at: new Date().toISOString() })
      .eq('id', id).eq('status', call.status).select('*').maybeSingle();
    if (updateError || !data) throw new Error('Call status changed. Please try again.');
    return { success: true, call: data };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Could not update call.' }; }
}
