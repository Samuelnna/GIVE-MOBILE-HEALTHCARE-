'use server';

import { checkoutUser, paymentClient } from '../lib/consultation-checkout';

export async function getAdminPayments(accessToken: string) {
  try {
    const user = await checkoutUser(accessToken);
    const db = paymentClient();
    const { data: profile, error: profileError } = await db.from('profiles')
      .select('user_type, status').eq('id', user.id).maybeSingle();
    if (profileError) throw new Error('Could not verify administrator permissions.');
    if (profile?.user_type !== 'admin' || profile.status !== 'active') {
      throw new Error('Your signed-in account does not have an active admin profile in the database.');
    }
    // Fetch payments independently of profile relationship names or profile RLS.
    const { data: payments, error } = await db.from('payments').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(`Could not load payments: ${error.message}`);
    const ids = [...new Set((payments || []).flatMap(payment => [
      payment.user_id,
      payment.details?.professional_id,
      payment.details?.doctor_id,
    ]).filter(Boolean))];
    const profiles = new Map<string, { full_name: string; email: string; role: string | null }>();
    for (let offset = 0; offset < ids.length; offset += 100) {
      const { data: users, error: profilesError } = await db.from('profiles')
        .select('id, full_name, email, role').in('id', ids.slice(offset, offset + 100));
      if (profilesError) throw new Error(`Could not load payment contact details: ${profilesError.message}`);
      for (const userProfile of users || []) profiles.set(userProfile.id, userProfile);
    }
    const consultationIds = (payments || [])
      .filter(payment => ['doctor_consultation', 'professional_consultation'].includes(payment.payment_type))
      .map(payment => payment.id);
    const appointmentByPayment = new Map<string, any>();
    if (consultationIds.length) {
      const { data: appointments, error: appointmentsError } = await db.from('appointments')
        .select('id, payment_id, date, time, type, status').in('payment_id', consultationIds);
      if (appointmentsError) throw new Error(`Could not load consultation bookings: ${appointmentsError.message}`);
      for (const appointment of appointments || []) appointmentByPayment.set(appointment.payment_id, appointment);
    }
    return { success: true, payments: (payments || []).map(payment => ({
      ...payment, profiles: { full_name: profiles.get(payment.user_id)?.full_name || 'Unknown user' },
      patient: profiles.get(payment.user_id) || null,
      doctor: profiles.get(payment.details?.professional_id || payment.details?.doctor_id) || null,
      appointment: appointmentByPayment.get(payment.id) || null,
    })) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not load payments.' };
  }
}
