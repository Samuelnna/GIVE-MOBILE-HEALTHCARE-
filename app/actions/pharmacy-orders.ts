'use server';
import { checkoutUser, paymentClient } from '../lib/consultation-checkout';

export async function updatePharmacyFulfillment(token: string, orderId: string, status: string) {
  try {
    const user = await checkoutUser(token), db = paymentClient();
    const { data: profile, error: profileError } = await db.from('profiles')
      .select('user_type, status').eq('id', user.id).maybeSingle();
    if (profileError || profile?.user_type !== 'admin' || profile.status !== 'active') {
      throw new Error('Only an active administrator can update dispatch status.');
    }
    if (!['pending', 'dispatched', 'delivered'].includes(status)) throw new Error('Invalid fulfilment status.');
    const { data, error } = await db.from('pharmacy_orders').update({ fulfillment_status: status })
      .eq('id', orderId).select('id, fulfillment_status').maybeSingle();
    if (error) throw new Error(`Could not update dispatch: ${error.message}`);
    if (!data) throw new Error('Order not found.');
    return { success: true, order: data };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Could not update dispatch.' }; }
}

export async function getMyPharmacyOrders(token: string) {
  try {
    const user = await checkoutUser(token);
    const { data, error } = await paymentClient().from('pharmacy_orders')
      .select('*, items:pharmacy_order_items(id, quantity, price_at_time, medication:medications(name))')
      .eq('patient_id', user.id).order('created_at', { ascending: false });
    if (error) throw new Error(`Could not load your pharmacy orders: ${error.message}`);
    return { success: true, orders: data || [] };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Could not load orders.' }; }
}

export async function confirmPharmacyOrderReceipt(token: string, orderId: string, status: 'received' | 'not_received') {
  try {
    const user = await checkoutUser(token);
    if (!['received', 'not_received'].includes(status)) throw new Error('Choose received or not received.');
    const { data, error } = await paymentClient().from('pharmacy_orders')
      .update({ receipt_status: status, receipt_updated_at: new Date().toISOString() })
      .eq('id', orderId).eq('patient_id', user.id).select('id, receipt_status, receipt_updated_at').maybeSingle();
    if (error) {
      if (['42703', 'PGRST204'].includes(error.code)) throw new Error('Receipt confirmation is not enabled yet. Please contact support to enable order tracking.');
      throw new Error(`Could not save your receipt update: ${error.message}`);
    }
    if (!data) throw new Error('This order could not be found in your account.');
    return { success: true, order: data };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Could not update receipt.' }; }
}
