import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { paymentClient, checkoutUser, prepareCheckout, confirmCheckout } from '../../lib/consultation-checkout';
import { startConsultationCall, listConsultationCalls, updateConsultationCall } from '../../actions/calls';
import { getMyPharmacyOrders, confirmPharmacyOrderReceipt } from '../../actions/pharmacy-orders';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers });
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers }); }
function text(value: unknown, max = 4000) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function required(value: unknown, label: string) { const result = text(value); if (!result) throw new Error(`${label} is required.`); return result; }

async function hostedCheckout(payment: any, email: string) {
  const secret = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secret) throw new Error('Payments are not configured on the server.');
  const db = paymentClient(), pharmacy = payment.payment_type === 'pharmacy_order';
  const providerId = pharmacy ? payment.details.pharmacy_id : payment.details.professional_id;
  const { data: provider } = await db.from(pharmacy ? 'pharmacies' : 'profiles').select('subaccount_id').eq('id', providerId).maybeSingle();
  const { data: settings } = await db.from('platform_settings').select('data').eq('id', 'commission_rates').maybeSingle();
  const share = Math.min(.95, Math.max(.05, Number(settings?.data?.[pharmacy ? 'pharmacy_share' : 'doctor_share'] ?? (pharmacy ? .9 : .7))));
  const response = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ tx_ref: payment.tx_ref, amount: payment.amount, currency: 'NGN', redirect_url: 'https://mobiledoc247.com/mobile/payment-return', customer: { email }, ...(provider?.subaccount_id ? { subaccounts: [{ id: provider.subaccount_id, transaction_split_ratio: share }] } : {}), customizations: { title: 'MobileDoc', description: pharmacy ? 'Pharmacy order' : 'Professional consultation' } }), signal: AbortSignal.timeout(20000),
  });
  const body = await response.json();
  if (!response.ok || body.status !== 'success' || !body.data?.link?.startsWith('https://')) throw new Error('Could not open secure checkout. Please retry.');
  return { success: true, payment, url: body.data.link };
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '') || '';
  if (!token) return json({ success: false, error: 'Sign in required.' }, 401);
  try {
    const user = await checkoutUser(token), service = paymentClient();
    const { data: profile, error: profileError } = await service.from('profiles').select('user_type,status').eq('id', user.id).single();
    if (profileError || !['patient', 'professional'].includes(profile?.user_type)) return json({ success: false, error: 'A patient or medical professional account is required.' }, 403);
    let body: any;
    try { body = await request.json(); } catch { return json({ success: false, error: 'Invalid JSON.' }, 400); }
    const scoped = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
    if (body.action === 'calls.list') return json(await listConsultationCalls(token));
    if (body.action === 'calls.update') return json(await updateConsultationCall(token, text(body.id), body.status));
    if (body.action === 'calls.start') return json(await startConsultationCall(token, text(body.peerId), body.appointmentId, body.mode));
    if (body.action === 'orders.list') return json(await getMyPharmacyOrders(token));
    if (body.action === 'orders.receipt') return json(await confirmPharmacyOrderReceipt(token, text(body.id), body.status));
    if (body.action === 'clinical.save') {
      if (profile.user_type !== 'professional' || profile.status !== 'active') throw new Error('An approved professional account is required.');
      const patientId = required(body.patientId, 'Patient');
      const { data: relationship, error: relationshipError } = await service.from('appointments').select('id').eq('doctor_id', user.id).eq('patient_id', patientId).in('status', ['Upcoming', 'Completed']).limit(1);
      if (relationshipError || !relationship?.length) throw new Error('An accepted or completed appointment with this patient is required.');
      const instructions = required(body.instructions, 'Clinical instructions');
      let result;
      if (body.kind === 'Prescribe') {
        const days = Number(body.days);
        if (!Number.isInteger(days) || days < 1 || days > 365) throw new Error('Invalid prescription duration.');
        const { data: med } = await service.from('medications').select('id,pharmacy_id').eq('id', required(body.targetId, 'Medicine')).single();
        if (!med) throw new Error('Medicine not found.');
        result = await scoped.from('prescriptions').insert({ doctor_id: user.id, patient_id: patientId, medication_id: med.id, pharmacy_id: med.pharmacy_id, dosage: required(body.dosage, 'Dosage'), instructions, duration_days: days, reminders_enabled: true, is_reminder_activated: false, status: 'active' });
      } else if (body.kind === 'Refer') {
        const { data: target } = await service.from('profiles').select('id').eq('id', required(body.targetId, 'Professional')).eq('user_type', 'professional').eq('status', 'active').single();
        if (!target || target.id === user.id) throw new Error('Choose another approved professional.');
        result = await scoped.from('referrals').insert({ doctor_id: user.id, patient_id: patientId, referred_doctor_id: target.id, reason: instructions, status: 'pending' });
      } else throw new Error('Invalid clinical action.');
      if (result.error) throw result.error;
      return json({ success: true });
    }
    if (body.action === 'consultation.prepare') {
      if (profile.user_type !== 'patient') throw new Error('Only patients can book consultations.');
      return json(await hostedCheckout(await prepareCheckout(token, required(body.professionalId, 'Professional')), user.email!));
    }
    if (body.action === 'consultation.confirm') return json({ success: true, payment: await confirmCheckout(required(body.reference, 'Payment reference'), user.id) });
    if (body.action === 'consultation.book') {
      if (profile.user_type !== 'patient') throw new Error('Only patients can book consultations.');
      const payment = await confirmCheckout(required(body.reference, 'Payment reference'), user.id);
      const { data: doctor } = await service.from('profiles').select('status').eq('id', payment.details.professional_id).single();
      if (doctor?.status !== 'active') throw new Error('This professional is unavailable. Your payment is saved; contact support before paying again.');
      const date = required(body.date, 'Date'), time = required(body.time, 'Time');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || !Number.isFinite(Date.parse(`${date}T${time}:00+01:00`)) || Date.parse(`${date}T${time}:00+01:00`) < Date.now()) throw new Error('Choose a valid future date and time (West Africa Time).');
      if (!['Video Call', 'Audio Call', 'Messaging', 'In-Person'].includes(body.type)) throw new Error('Select a consultation type.');
      const { data: existing, error: lookupError } = await service.from('appointments').select('*').eq('payment_id', payment.id).maybeSingle();
      if (lookupError) throw lookupError;
      if (existing) return json({ success: true, appointment: existing });
      const { data, error } = await scoped.from('appointments').insert({ patient_id: user.id, doctor_id: payment.details.professional_id, payment_id: payment.id, date, time, type: body.type, status: 'Pending', reason_for_visit: required(body.reason, 'Reason for visit') }).select('*').single();
      if (error) throw error;
      return json({ success: true, appointment: data });
    }
    if (body.action === 'pharmacy.prepare') {
      if (profile.user_type !== 'patient') throw new Error('Only patients can place orders.');
      if (!Array.isArray(body.items) || !body.items.length || body.items.length > 50) throw new Error('Select 1–50 medicines.');
      const items = body.items.map((item: any) => ({ id: text(item.id), quantity: Number(item.quantity) }));
      if (items.some((item: any) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) || new Set(items.map((i: any) => i.id)).size !== items.length) throw new Error('Invalid medicine quantities.');
      const { data: meds, error } = await service.from('medications').select('*').in('id', items.map((i: any) => i.id));
      if (error || meds?.length !== items.length) throw new Error('Some medicines are no longer available.');
      if (new Set(meds.map(m => m.pharmacy_id)).size !== 1) throw new Error('Order from one pharmacy at a time.');
      const orderItems = items.map((i: any) => { const med = meds.find(m => m.id === i.id)!; if (Number(med.stock_quantity) < i.quantity) throw new Error(`${med.name} has insufficient stock.`); return { medication_id: med.id, quantity: i.quantity, price_at_time: Number(med.price) }; });
      const method = body.deliveryMethod;
      if (!['Home Delivery', 'In-Person Pickup'].includes(method)) throw new Error('Choose delivery or pickup.');
      const address = method === 'Home Delivery' ? required(body.address, 'Delivery address') : null;
      const phone = method === 'Home Delivery' ? required(body.phone, 'Delivery phone') : null;
      const { data: pharmacy } = await service.from('pharmacies').select('name,location').eq('id', meds[0].pharmacy_id).single();
      const { data: payment, error: saveError } = await service.from('payments').insert({ user_id: user.id, amount: orderItems.reduce((sum: number, i: any) => sum + i.quantity * i.price_at_time, 0), currency: 'NGN', status: 'pending', payment_type: 'pharmacy_order', tx_ref: `MOB-${randomUUID()}`, details: { mobile_checkout: 1, customer_email: user.email, items: orderItems, pharmacy_id: meds[0].pharmacy_id, delivery_method: method, delivery_address: address, delivery_phone: phone, pickup_location: pharmacy?.location || pharmacy?.name } }).select('*').single();
      if (saveError) throw saveError;
      return json(await hostedCheckout(payment, user.email!));
    }
    if (body.action === 'pharmacy.confirm') {
      const reference = required(body.reference, 'Payment reference');
      const { data: payment, error } = await service.from('payments').select('*').eq('tx_ref', reference).eq('user_id', user.id).single();
      if (error || payment?.payment_type !== 'pharmacy_order' || payment.details?.mobile_checkout !== 1) throw new Error('Checkout not found.');
      const response = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` }, signal: AbortSignal.timeout(20000) });
      const verified = await response.json(), tx = verified.data;
      if (!response.ok || verified.status !== 'success' || tx?.status !== 'successful' || tx.tx_ref !== reference || Number(tx.amount) !== Number(payment.amount) || tx.currency !== payment.currency || String(tx.customer?.email).toLowerCase() !== String(payment.details.customer_email).toLowerCase()) throw new Error('Payment is not confirmed yet. Retry confirmation without paying again.');
      const { data, error: finishError } = await service.rpc('complete_mobile_pharmacy_order', { payment_reference: reference, owner_id: user.id, gateway_id: String(tx.id) });
      if (finishError) throw new Error(`Payment verified; order needs confirmation. Do not pay again. Reference: ${reference}. ${finishError.message}`);
      return json({ success: true, order: data });
    }
    if (body.action === 'earnings') {
      if (profile.user_type !== 'professional' || profile.status !== 'active') throw new Error('An approved professional account is required.');
      const { data, error } = await service.from('payments').select('*').in('status', ['successful', 'completed']).in('payment_type', ['doctor_consultation', 'professional_consultation']).or(`details->>professional_id.eq.${user.id},details->>doctor_id.eq.${user.id}`).order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      const { data: settings } = await service.from('platform_settings').select('data').eq('id', 'commission_rates').maybeSingle();
      return json({ success: true, payments: data, share: settings?.data?.doctor_share ?? .7 });
    }
    return json({ success: false, error: 'Unknown mobile action.' }, 400);
  } catch (e) { return json({ success: false, error: e instanceof Error ? e.message : (e as any)?.message || 'Request failed.' }, 400); }
}
