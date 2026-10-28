const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), ts = require('typescript');
let rows, writes, confirmations, gatewayResponse, profileMatches, collide;
const db = { from(table) {
  let operation = 'read', payload, filters = [];
  const q = {
    select() { return q; }, order() { return q; }, range() { return q; }, ilike() { return q; },
    eq(key, value) { filters.push(row => row[key] === value); return q; },
    insert(value) { operation = 'insert'; payload = value; return q; },
    update(value) { operation = 'update'; payload = value; return q; },
    single() { return q; },
    then(resolve, reject) { return Promise.resolve().then(() => {
      if (table === 'profiles') return { data: profileMatches };
      if (operation === 'insert') {
        if (collide) { collide = false; rows.push({ id: 'concurrent', ...payload }); return { error: { code: '23505' } }; }
        writes++; const row = { id: 'new', ...payload }; rows.push(row); return { data: row };
      }
      if (operation === 'update') { writes++; const row = rows.find(row => filters.every(f => f(row))); Object.assign(row, payload); return { data: row }; }
      return { data: rows };
    }).then(resolve, reject); },
  }; return q;
} };
const context = { exports: {}, process: { env: { FLUTTERWAVE_SECRET_KEY: 'test' } }, Date, Set, AbortSignal,
  fetch: async () => ({ ok: true, json: async () => gatewayResponse }),
  require(name) { return name === 'server-only' ? {} : {
    paymentClient: () => db, confirmCheckout: async () => { confirmations++; return { id: 'confirmed' }; },
  }; },
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/lib/payment-reconciliation.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, context);
const { recordGatewayPayment, verifyGatewayPayment, matchingPayment, reconcileGatewayPayments } = context.exports;
const tx = { id: '12345', status: 'successful', amount: 1000, currency: 'NGN', tx_ref: 'MDOC-test-1',
  flw_ref: 'FLW-test', created_at: '2026-10-14T12:00:00Z', customer: { email: 'patient@example.com' } };
function reset() { rows = []; writes = 0; confirmations = 0; profileMatches = [{ id: 'patient' }]; collide = false; gatewayResponse = { status: 'success', data: tx }; }
(async () => {
  reset();
  const verified = await verifyGatewayPayment(tx.tx_ref);
  const first = await recordGatewayPayment(verified);
  assert.equal(first.recovered, true); assert.equal(writes, 1);
  assert.equal(first.payment.payment_type, 'gateway_unclassified');
  assert.equal(first.payment.created_at, tx.created_at);
  assert.equal(first.payment.details.professional_id, undefined);
  assert.equal(first.payment.details.customer_email, undefined);
  await recordGatewayPayment(verified); assert.equal(writes, 1);
  reset(); profileMatches = []; await recordGatewayPayment(tx); assert.equal(rows[0].user_id, null);
  reset(); rows = [{ id: 'old', tx_ref: 'GIVE-different', flw_ref: tx.flw_ref, amount: 1000, status: 'successful', payment_type: 'pharmacy_order' }];
  await recordGatewayPayment(tx); assert.equal(rows.length, 1); assert.equal(rows[0].tx_ref, tx.tx_ref); assert.equal(rows[0].payment_type, 'pharmacy_order');
  reset(); rows = [{ id: 'old', tx_ref: tx.tx_ref, amount: 999, currency: 'NGN', status: 'successful' }];
  await assert.rejects(() => recordGatewayPayment(tx), /differs/); assert.equal(writes, 0);
  reset(); rows = [{ id: 'pending', tx_ref: tx.tx_ref, amount: 1000, currency: 'NGN', status: 'pending', details: { checkout_version: 2 } }];
  await recordGatewayPayment(tx); assert.equal(confirmations, 1); assert.equal(writes, 0);
  reset(); rows = [{ id: 'pending', tx_ref: tx.tx_ref, amount: 1000, status: 'pending' }];
  await assert.rejects(() => recordGatewayPayment(tx), /review/); assert.equal(writes, 0);
  reset(); collide = true; await recordGatewayPayment(tx); assert.equal(rows.length, 1);
  reset(); assert.throws(() => matchingPayment([{ tx_ref: tx.tx_ref }, { flw_id: tx.id }], tx), /Multiple/);
  for (const change of [{ status: 'failed' }, { amount: -1 }, { id: Number.MAX_SAFE_INTEGER + 1 }, { tx_ref: 'MDOC-another' }]) {
    reset(); gatewayResponse.data = { ...tx, ...change };
    await assert.rejects(() => verifyGatewayPayment(tx.tx_ref)); assert.equal(writes, 0);
  }
  reset(); await assert.rejects(() => verifyGatewayPayment('UNRELATED-1'), /Unsupported/);
  reset(); gatewayResponse = { status: 'success', data: [tx, { ...tx, tx_ref: 'UNRELATED-1' }], meta: { page_info: { total_pages: 1 } } };
  // Return list data for listing and transaction data for individual verification.
  context.fetch = async url => ({ ok: true, json: async () => url.includes('verify_by_reference') ? { status: 'success', data: tx } : gatewayResponse });
  const dry = await reconcileGatewayPayments(); assert.equal(dry.recovered, 1); assert.equal(writes, 0);
  const applied = await reconcileGatewayPayments(true); assert.equal(applied.recovered, 1); assert.equal(writes, 1);
  const repeat = await reconcileGatewayPayments(true); assert.equal(repeat.recovered, 0); assert.equal(writes, 1);
  let saved = 0, boundTx = tx, recorded = { id: 'recovered', user_id: 'patient', payment_type: 'gateway_unclassified', details: {} };
  let update;
  const action = { exports: {}, require(name) {
    return name.includes('consultation-checkout') ? {
      checkoutUser: async () => ({ id: 'patient', email: 'patient@example.com' }),
      paymentClient: () => ({ from: () => ({
        update(value) { update = value; return this; }, eq() { return this; }, select() { return this; },
        maybeSingle: async () => { saved++; return { data: { ...recorded, ...update } }; },
      }) }),
    } : { verifyGatewayPayment: async () => boundTx, recordGatewayPayment: async () => ({ payment: recorded }) };
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/actions/verified-payment.ts', 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, action);
  const save = input => action.exports.saveVerifiedServicePayment('token', { tx_ref: tx.tx_ref, amount: 1000, payment_type: 'pharmacy_order', ...input });
  assert.equal((await save({ payment_type: 'doctor_consultation' })).success, false);
  assert.equal((await save({ amount: 999 })).success, false);
  boundTx = { ...tx, customer: { email: 'another@example.com' } };
  assert.equal((await save({})).success, false);
  boundTx = tx; recorded.user_id = 'another'; assert.equal((await save({})).success, false);
  assert.equal(saved, 0);
  recorded.user_id = 'patient';
  assert.equal((await save({ details: { pharmacy_id: 'pharmacy', professional_id: 'forged', checkout_version: 2 } })).success, true);
  assert.equal(saved, 1); assert.equal(update.details.pharmacy_id, 'pharmacy');
  assert.equal(update.details.professional_id, undefined); assert.equal(update.details.checkout_version, undefined);
  recorded.payment_type = 'pharmacy_order'; assert.equal((await save({})).success, true); assert.equal(saved, 1);
  console.log('PASS: verified recovery, idempotency, reference repair, concurrent inserts, original dates, unknown owners, no invented clinical access, amount conflicts, unsafe IDs, failed charges, supported references, dry run, and repeat reconciliation.');
  console.log('PASS: service callbacks reject another customer, incorrect amounts, consultation types, another owner, and forged access metadata; repeated callbacks reuse the saved payment.');
})().catch(error => { console.error(error); process.exitCode = 1; });
