'use server';

import { checkoutUser, paymentClient } from '../lib/consultation-checkout';
import { recordGatewayPayment, verifyGatewayPayment } from '../lib/payment-reconciliation';

export async function saveVerifiedServicePayment(token: string, input: Record<string, unknown>) {
  try {
    const user = await checkoutUser(token);
    if (!['pharmacy_order', 'lab_test', 'hospital_appointment'].includes(String(input.payment_type))) {
      throw new Error('Unsupported service payment.');
    }
    const tx = await verifyGatewayPayment(String(input.tx_ref || ''));
    if (String(tx.customer?.email || '').trim().toLowerCase() !== user.email!.trim().toLowerCase() ||
        tx.currency !== 'NGN' || Number(tx.amount) !== Number(input.amount)) {
      throw new Error('The verified payment does not match this account or amount.');
    }
    const db = paymentClient();
    const { payment } = await recordGatewayPayment(tx, db);
    if ((payment.user_id && payment.user_id !== user.id) ||
        !['gateway_unclassified', input.payment_type].includes(payment.payment_type)) {
      throw new Error('This payment is already associated with another account or service.');
    }
    if (payment.payment_type !== 'gateway_unclassified') return { success: true, payment };
    const allowed = ['pharmacy_id', 'item_count', 'delivery_method', 'delivery_address', 'delivery_phone',
      'pickup_location', 'lab_id', 'test_id', 'test_name', 'hospital_id', 'service_name', 'patient_name'];
    const supplied = input.details && typeof input.details === 'object' ? input.details as Record<string, unknown> : {};
    const details = Object.fromEntries(Object.entries(supplied).filter(([key, value]) =>
      allowed.includes(key) && (typeof value === 'string' && value.length <= 1000 || typeof value === 'number' && Number.isFinite(value))));
    const { data, error } = await db.from('payments').update({ user_id: user.id, payment_type: input.payment_type,
      details: { ...payment.details, ...details, service_details_unavailable: false }, updated_at: new Date().toISOString(),
    }).eq('id', payment.id).eq('payment_type', 'gateway_unclassified').select('*').maybeSingle();
    if (error || !data) throw new Error('Payment is verified but its service details could not be saved. Retry without paying again.');
    return { success: true, payment: data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not record the verified payment.' };
  }
}
