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
    const ids = [...new Set((payments || []).map(payment => payment.user_id).filter(Boolean))];
    const names = new Map<string, string>();
    for (let offset = 0; offset < ids.length; offset += 100) {
      const { data: users, error: namesError } = await db.from('profiles')
        .select('id, full_name').in('id', ids.slice(offset, offset + 100));
      if (namesError) throw new Error(`Could not load payment user names: ${namesError.message}`);
      for (const userProfile of users || []) names.set(userProfile.id, userProfile.full_name);
    }
    return { success: true, payments: (payments || []).map(payment => ({
      ...payment, profiles: { full_name: names.get(payment.user_id) || 'Unknown user' },
    })) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Could not load payments.' };
  }
}
