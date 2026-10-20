'use server';
import { checkoutUser, paymentClient } from '../lib/consultation-checkout';
import { summarizeTraction, type TractionPeriod } from '../../src/traction';

export async function getAdminTraction(token: string, period: TractionPeriod = 'all') {
  try {
    const user = await checkoutUser(token), db = paymentClient();
    const { data: admin, error } = await db.from('profiles').select('user_type, status').eq('id', user.id).maybeSingle();
    if (error || admin?.user_type !== 'admin' || admin.status !== 'active') throw new Error('Active administrator access is required.');
    if (!['all', '30', '90'].includes(period)) throw new Error('Invalid reporting period.');
    const missing: string[] = [];
    async function rows(table: string, columns: string) {
      const collected: Record<string, any>[] = [];
      for (let page = 0; ; page++) {
        const result = await db.from(table).select(columns).order('id').range(page * 1000, page * 1000 + 999);
        if (result.error) throw new Error(`${table} could not be loaded (${result.error.code || 'database error'}).`);
        const batch = result.data || []; collected.push(...batch);
        if (batch.length < 1000) return collected;
      }
    }
    const results = await Promise.allSettled([
      rows('profiles', 'id, user_type, status, created_at'),
      rows('payments', 'id, user_id, amount, currency, payment_type, status, created_at'),
      rows('appointments', 'id, status, created_at'),
      rows('pharmacy_orders', '*'),
      rows('cart_items', 'id, user_id, quantity, created_at'),
      rows('emr_records', 'id, patient_id, record_type, created_at'),
      rows('analytics_cart_events', 'id, quantity, created_at'),
    ]);
    const labels = ['Account profiles', 'Payments', 'Consultations', 'Medicine orders', 'Current carts', 'AI triage', 'Cart additions'];
    const data = results.map((result, index) => {
      if (result.status === 'fulfilled') return result.value;
      missing.push(labels[index]); return [];
    });
    // A source failure must never appear as a valid zero in the investor view.
    let accounts: { id: string; created_at: string }[] = [];
    try {
      for (let page = 1; ; page++) {
        const result = await db.auth.admin.listUsers({ page, perPage: 1000 });
        if (result.error) throw result.error;
        accounts.push(...result.data.users.map(account => ({ id: account.id, created_at: account.created_at })));
        if (result.data.users.length < 1000) break;
      }
    } catch { missing.push('Auth signups'); accounts = []; }
    const [settings, tracking] = await Promise.allSettled([
      db.from('platform_settings').select('data').eq('id', 'commission_rates').maybeSingle(),
      db.from('analytics_tracking_config').select('started_at').eq('id', 'cart_additions').maybeSingle(),
    ]);
    const rates = settings.status === 'fulfilled' && !settings.value.error ? settings.value.data?.data : null;
    if (!rates) missing.push('Commission settings (default estimates used)');
    const started = tracking.status === 'fulfilled' && !tracking.value.error ? tracking.value.data?.started_at : null;
    return { success: true, report: summarizeTraction({ accounts, profiles: data[0], payments: data[1], appointments: data[2],
      orders: data[3], cart: data[4], triage: data[5], cartEvents: data[6], trackingStartedAt: started || null, rates: rates || {}, missing }, period) };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Could not load traction.' }; }
}
