import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

export function paymentClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server payment database configuration is missing.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function checkoutUser(token: string) {
  const { data, error } = await paymentClient().auth.getUser(token);
  if (error || !data.user?.email) throw new Error('Please sign in again.');
  return data.user;
}

export async function prepareCheckout(token: string, professionalId: string) {
  const user = await checkoutUser(token);
  const db = paymentClient();
  const { data: professional, error } = await db.from('profiles')
    .select('*').eq('id', professionalId).maybeSingle();
  if (error) throw new Error(`Could not load this professional's profile: ${error.message}`);
  if (!professional) throw new Error('This professional profile could not be found. Refresh the professional list.');
  if (professional.user_type !== 'professional') throw new Error('This account is not registered as a healthcare professional. Contact support.');
  if (professional.status !== 'active') throw new Error('This professional has not been approved or is currently inactive. Choose an active professional or contact support.');
  const { data: payment, error: saveError } = await db.from('payments').insert({
    user_id: user.id, amount: 100, currency: 'NGN', status: 'pending',
    payment_type: /(doctor|physician|surgeon|consultant|general practitioner|cardiologist|neurologist|pediatrician|dentist|specialist)/i.test(`${professional.role || ''} ${professional.specialty || ''}`)
      ? 'doctor_consultation' : 'professional_consultation', tx_ref: `MDOC-${randomUUID()}`,
    details: { checkout_version: 2, customer_email: user.email,
      professional_id: professional.id, doctor_id: professional.id,
      professional_name: professional.full_name },
  }).select('*').single();
  if (saveError) throw new Error(`Checkout was not opened because the payment record could not be saved: ${saveError.message}`);
  return payment;
}

// Only server-created v2 rows can be confirmed through this path. Gateway metadata
// is unnecessary: the immutable, random reference binds the charge to its owner.
export async function confirmCheckout(reference: string, ownerId?: string, transactionId?: string) {
  if (!/^MDOC-[A-Za-z0-9-]+$/.test(reference)) throw new Error('Invalid payment reference.');
  const db = paymentClient();
  const { data: payment, error } = await db.from('payments').select('*').eq('tx_ref', reference).maybeSingle();
  if (error) throw new Error(`Payment lookup failed: ${error.message}`);
  if (!payment || !['doctor_consultation', 'professional_consultation'].includes(payment.payment_type) ||
      payment.details?.checkout_version !== 2 || (ownerId && payment.user_id !== ownerId)) {
    throw new Error('No matching consultation checkout was found.');
  }
  if (payment.status === 'successful') return payment;
  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secret) throw new Error('Flutterwave server verification is not configured.');
  const candidateId = transactionId || payment.flw_id;
  const validId = typeof candidateId === 'string' && /^\d+$/.test(candidateId);
  // Persist only a lookup hint, never a successful status from browser data.
  if (validId && candidateId !== payment.flw_id) {
    const { error: hintError } = await db.from('payments').update({ flw_id: candidateId })
      .eq('id', payment.id).eq('status', 'pending');
    if (hintError) console.error('Could not save consultation verification hint:', hintError.code);
  }
  const paths = [
    ...(validId ? [`transactions/${encodeURIComponent(candidateId)}/verify`] : []),
    `transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
  ];
  let verified: any;
  let failure = 'Flutterwave could not verify this charge. Retry confirmation without paying again.';
  for (const path of paths) {
    try {
      const response = await fetch(`https://api.flutterwave.com/v3/${path}`, {
        headers: { Authorization: `Bearer ${secret}` }, cache: 'no-store', signal: AbortSignal.timeout(10000),
      });
      if (response.status === 401 || response.status === 403) {
        throw new Error('Flutterwave rejected server verification credentials. Check that the public and secret keys belong to the same account and mode, then restart localhost.');
      }
      const body = await response.json().catch(() => null);
      if (response.ok && body?.status === 'success' && body.data) { verified = body; break; }
      console.error('Consultation verification lookup failed:', { httpStatus: response.status, gatewayStatus: body?.status });
      failure = response.status === 400 || response.status === 404
        ? `Flutterwave could not find this payment (HTTP ${response.status}). Check the payment reference and that both keys use the same account and test/live mode. Do not pay again.`
        : `Flutterwave verification returned HTTP ${response.status}. Retry confirmation without paying again.`;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Flutterwave rejected')) throw error;
      failure = 'Could not reach Flutterwave verification. Check the server internet connection and retry confirmation without paying again.';
      console.error('Consultation verification request failed:', error instanceof Error ? error.name : 'Unknown error');
    }
  }
  if (!verified) throw new Error(failure);
  const tx = verified.data;
  if (verified.status !== 'success' || tx?.status !== 'successful') {
    throw new Error('Flutterwave has not confirmed this charge yet. Retry confirmation without paying again.');
  }
  if (tx.tx_ref !== reference || Number(tx.amount) !== Number(payment.amount) || tx.currency !== payment.currency ||
      String(tx.customer?.email || '').toLowerCase() !== String(payment.details.customer_email).toLowerCase()) {
    throw new Error('The verified charge does not match this consultation checkout. Contact support.');
  }
  const flwId = typeof tx.id === 'string' ? tx.id : Number.isSafeInteger(tx.id) ? String(tx.id) : null;
  if (!flwId) throw new Error('Flutterwave returned an invalid transaction ID. Contact support.');
  const { data: updated, error: updateError } = await db.from('payments').update({
    status: 'successful', flw_id: flwId, flw_ref: tx.flw_ref || null, updated_at: new Date().toISOString(),
  }).eq('id', payment.id).eq('status', 'pending').select('*').maybeSingle();
  if (updateError) throw new Error(`Verified payment could not be saved: ${updateError.message}`);
  if (updated) return updated;
  const { data: concurrent, error: readError } = await db.from('payments').select('*').eq('id', payment.id).single();
  if (readError || concurrent?.status !== 'successful') throw new Error('Payment confirmation is pending. Contact support.');
  return concurrent;
}
