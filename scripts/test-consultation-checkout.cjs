// Mock external services; never charge money or connect to the real database.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
let row, transaction, databaseError, updates = 0, requests = 0;
let httpStatus = 200, fetchedUrls = [], failIdLookup = false;
const db = {
  auth: { getUser: async () => ({ data: { user: { id: 'patient', email: 'patient@example.com' } } }) },
  from(table) {
    let mutation, value;
    return {
      select() { return this; }, eq() { return this; },
      insert(data) { mutation = 'insert'; value = data; return this; },
      update(data) { mutation = 'update'; value = data; return this; },
      async single() {
        if (table === 'profiles') return { data: { id: 'doctor', full_name: 'Doctor', user_type: 'professional', status: 'active' } };
        return this.maybeSingle();
      },
      async maybeSingle() {
        if (table === 'profiles') return { data: { id: 'doctor', full_name: 'Doctor', user_type: 'professional', status: 'active', role: 'doctor' } };
        if (databaseError && mutation) return { error: { message: 'database unavailable' } };
        if (mutation === 'insert') row = { id: 'payment', ...value };
        if (mutation === 'update') { updates++; row = { ...row, ...value }; }
        return { data: row };
      },
    };
  },
};
const compiled = ts.transpileModule(fs.readFileSync('app/lib/consultation-checkout.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const context = {
  exports: {}, require(name) {
    if (name === 'server-only') return {};
    if (name === '@supabase/supabase-js') return { createClient: () => db };
    return require(name);
  },
  process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'mock', SUPABASE_SERVICE_ROLE_KEY: 'mock', FLUTTERWAVE_SECRET_KEY: 'mock' } },
  AbortSignal,
  fetch: async (url) => {
    requests++; fetchedUrls.push(url);
    const status = failIdLookup && /\/123\/verify$/.test(url) ? 404 : httpStatus;
    return { ok: status === 200, status, json: async () => ({ status: status === 200 ? 'success' : 'error', data: status === 200 ? transaction : null }) };
  },
  console: { error() {} },
};
vm.runInNewContext(compiled, context);
const { prepareCheckout, confirmCheckout } = context.exports;
(async () => {
  databaseError = true;
  await assert.rejects(prepareCheckout('token', 'doctor'), /could not be saved/);
  assert.equal(row, undefined);
  databaseError = false;
  const pending = await prepareCheckout('token', 'doctor');
  assert.equal(pending.status, 'pending');
  assert.equal(pending.amount, 1000);
  assert.match(pending.tx_ref, /^MDOC-/);
  const ref = pending.tx_ref;
  const valid = { id: 123, tx_ref: ref, amount: 1000, currency: 'NGN', status: 'successful', customer: { email: 'patient@example.com' } };
  await assert.rejects(confirmCheckout(ref, 'other-patient'), /No matching/);
  assert.equal(requests, 0);
  for (const patch of [{ amount: 99 }, { currency: 'USD' }, { tx_ref: 'MDOC-other' }, { customer: { email: 'other@example.com' } }]) {
    transaction = { ...valid, ...patch };
    await assert.rejects(confirmCheckout(ref, 'patient'), /does not match/);
    assert.equal(row.status, 'pending');
  }
  transaction = { ...valid, status: 'pending' };
  await assert.rejects(confirmCheckout(ref, 'patient'), /not confirmed/);
  transaction = valid; databaseError = true;
  await assert.rejects(confirmCheckout(ref, 'patient'), /could not be saved/);
  assert.equal(row.status, 'pending');
  databaseError = false;
  const result = await confirmCheckout(ref, 'patient');
  assert.equal(result.status, 'successful');
  assert.equal(result.flw_id, '123');
  await confirmCheckout(ref); // webhook retry
  await confirmCheckout(ref, 'patient'); // browser retry
  assert.equal(updates, 1);
  row = { ...pending, payment_type: 'pharmacy_order' };
  await assert.rejects(confirmCheckout(ref, 'patient'), /No matching/);
  row = { ...pending }; httpStatus = 401;
  await assert.rejects(confirmCheckout(ref, 'patient'), /rejected server verification credentials/);
  httpStatus = 404;
  await assert.rejects(confirmCheckout(ref, 'patient'), /could not find this payment \(HTTP 404\)/);
  httpStatus = 200; transaction = valid; fetchedUrls = [];
  await confirmCheckout(ref, 'patient', '123');
  assert.match(fetchedUrls[0], /transactions\/123\/verify$/);
  row = { ...pending }; failIdLookup = true; fetchedUrls = [];
  await confirmCheckout(ref, 'patient', '123');
  assert.equal(fetchedUrls.length, 2);
  assert.match(fetchedUrls[1], /verify_by_reference/);
  assert.equal(row.status, 'successful');
  console.log('PASS: pre-save failure, pending checkout, owner validation, amount/currency/reference/email checks, delayed charge, database retry, metadata-independent success, duplicate confirmation, and payment-type validation.');
})().catch(error => { console.error(error); process.exitCode = 1; });
