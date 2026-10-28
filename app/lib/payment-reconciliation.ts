import 'server-only';
import { paymentClient, confirmCheckout } from './consultation-checkout';

type Row = Record<string, any>;
const successful = (row: Row) => ['successful', 'completed'].includes(row.status);
const supportedReference = (reference: unknown): reference is string =>
  typeof reference === 'string' && /^(MDOC|GIVE|MOB)-[A-Za-z0-9-]+$/.test(reference);

async function gateway(path: string) {
  const key = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!key) throw new Error('Flutterwave reconciliation is not configured.');
  const response = await fetch(`https://api.flutterwave.com/v3/${path}`, {
    headers: { Authorization: `Bearer ${key}` }, cache: 'no-store', signal: AbortSignal.timeout(20000),
  });
  const body = await response.json();
  if (!response.ok || body.status !== 'success') throw new Error('Flutterwave reconciliation could not verify payments.');
  return body;
}

export async function verifyGatewayPayment(reference: string) {
  if (!supportedReference(reference)) throw new Error('Unsupported payment reference.');
  const { data: tx } = await gateway(`transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`);
  const id = typeof tx?.id === 'string' ? tx.id : Number.isSafeInteger(tx?.id) ? String(tx.id) : '';
  if (tx?.status !== 'successful' || tx.tx_ref !== reference || !id || !tx.currency ||
      !Number.isFinite(Number(tx.amount)) || Number(tx.amount) <= 0 || !Number.isFinite(Date.parse(tx.created_at))) {
    throw new Error('Flutterwave has not confirmed a valid successful payment.');
  }
  return { ...tx, id };
}

export async function paymentRows(db = paymentClient()): Promise<Row[]> {
  const rows: Row[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await db.from('payments').select('*').order('id').range(page * 1000, page * 1000 + 999);
    if (error) throw new Error('Could not load payments for reconciliation.');
    rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
}

export function matchingPayment(rows: Row[], tx: Row) {
  const matches = rows.filter(row => row.tx_ref === tx.tx_ref ||
    (row.flw_id && String(row.flw_id) === String(tx.id)) ||
    (row.flw_ref && tx.flw_ref && row.flw_ref === tx.flw_ref));
  if (matches.length > 1) throw new Error('Multiple website payments match one gateway charge. Manual review required.');
  return matches[0];
}

// Financial recovery deliberately grants no consultation access and creates no bookings.
// Service details can only be attached by an authenticated, verified checkout flow.
export async function recordGatewayPayment(tx: Row, db = paymentClient(), rows?: Row[]) {
  const existing = matchingPayment(rows || await paymentRows(db), tx);
  if (existing) {
    if (Number(existing.amount) !== Number(tx.amount) || (existing.currency || 'NGN') !== tx.currency) {
      throw new Error('A saved payment differs from its verified gateway charge. Manual review required.');
    }
    if (!successful(existing) && existing.details?.checkout_version === 2) {
      return { payment: await confirmCheckout(tx.tx_ref, undefined, String(tx.id)), recovered: false };
    }
    if (!successful(existing) && existing.details?.mobile_checkout === 1 && existing.payment_type === 'pharmacy_order') {
      if (String(tx.customer?.email || '').trim().toLowerCase() !== String(existing.details.customer_email || '').trim().toLowerCase()) {
        throw new Error('The verified customer does not match this mobile checkout.');
      }
      const { error } = await db.rpc('complete_mobile_pharmacy_order', {
        payment_reference: existing.tx_ref, owner_id: existing.user_id, gateway_id: String(tx.id),
      });
      if (error) throw new Error('Verified mobile pharmacy checkout could not be completed.');
      return { payment: existing, recovered: false };
    }
    if (!successful(existing)) throw new Error('An existing unconfirmed payment requires checkout review.');
    // Also repair older records that used a different client-side reference.
    if (existing.tx_ref === tx.tx_ref && String(existing.flw_id) === String(tx.id) && existing.flw_ref === tx.flw_ref) {
      return { payment: existing, recovered: false };
    }
    const { data, error } = await db.from('payments').update({ tx_ref: tx.tx_ref, flw_id: String(tx.id), flw_ref: tx.flw_ref || null,
      updated_at: new Date().toISOString() }).eq('id', existing.id).select('*').single();
    if (error) throw new Error('Could not repair the verified payment reference.');
    return { payment: data, recovered: false };
  }
  // Email identifies an existing profile only; unmatched/deleted users remain unassigned.
  const email = String(tx.customer?.email || '').trim().toLowerCase();
  let owner: string | null = null;
  if (email) {
    const { data, error } = await db.from('profiles').select('id').ilike('email', email.replace(/[\\%_]/g, '\\$&'));
    if (error) throw new Error('Could not match the verified payment owner.');
    if (data?.length === 1) owner = data[0].id;
  }
  const record = { user_id: owner, amount: Number(tx.amount), currency: tx.currency, tx_ref: tx.tx_ref,
    flw_id: String(tx.id), flw_ref: tx.flw_ref || null, status: 'successful', payment_type: 'gateway_unclassified',
    created_at: tx.created_at, details: { gateway_reconciled: true, service_details_unavailable: true,
      verified_at: new Date().toISOString() } };
  const { data, error } = await db.from('payments').insert(record).select('*').single();
  if (error?.code === '23505') {
    // A callback or repeated webhook may have won the unique-reference race.
    const concurrent = matchingPayment(await paymentRows(db), tx);
    if (concurrent && successful(concurrent) && Number(concurrent.amount) === Number(tx.amount) &&
        (concurrent.currency || 'NGN') === tx.currency) return { payment: concurrent, recovered: false };
  }
  if (error) throw new Error(`Could not save verified gateway payment (${error.code || 'database error'}).`);
  return { payment: data, recovered: true };
}

export async function reconcileGatewayPayments(apply = false) {
  const db = paymentClient(), rows = await paymentRows(db);
  const summary = { recovered: 0, repaired: 0, failed: 0, checked: 0 };
  const seen = new Set<string>();
  for (let page = 1; ; page++) {
    const body = await gateway(`transactions?from=2020-01-01&to=${new Date(Date.now() + 86400000).toISOString().slice(0, 10)}&page=${page}`);
    if (!Array.isArray(body.data)) throw new Error('Flutterwave returned an invalid transaction list.');
    for (const charge of body.data) {
      if (charge.status !== 'successful' || !supportedReference(charge.tx_ref) || seen.has(charge.tx_ref)) continue;
      seen.add(charge.tx_ref); summary.checked++;
      try {
        const existing = matchingPayment(rows, charge);
        if (existing && successful(existing) && existing.tx_ref === charge.tx_ref &&
            String(existing.flw_id) === String(charge.id) && Number(existing.amount) === Number(charge.amount) &&
            (existing.currency || 'NGN') === charge.currency) continue;
        const tx = await verifyGatewayPayment(charge.tx_ref);
        if (!apply) { if (existing) summary.repaired++; else summary.recovered++; continue; }
        const result = await recordGatewayPayment(tx, db, rows);
        if (result.recovered) { summary.recovered++; rows.push(result.payment); }
        else { summary.repaired++; Object.assign(existing || {}, result.payment); }
      } catch { summary.failed++; }
    }
    const pages = Number(body.meta?.page_info?.total_pages);
    if (!Number.isInteger(pages) || pages < 0) throw new Error('Flutterwave pagination is unavailable.');
    if (page >= pages) break;
    if (page >= 1000) throw new Error('Flutterwave reconciliation exceeded its page limit.');
  }
  return summary;
}
