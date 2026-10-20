const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), ts = require('typescript');
let user = 'patient-a', authFails = false, missingColumn = false;
let orders = [{ id: 'order-a', patient_id: 'patient-a', status: 'Paid', total_amount: 2000, fulfillment_status: 'pending' },
  { id: 'order-b', patient_id: 'patient-b', status: 'Paid', total_amount: 5000, fulfillment_status: 'delivered' }];
const db = { from(table) {
  if (table === 'profiles') return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: { user_type: user === 'admin' ? 'admin' : 'patient', status: 'active' } }; } };
  assert.equal(table, 'pharmacy_orders');
  const filters = {}; let update;
  return {
    select() { return this; }, eq(key, value) { filters[key] = value; return this; },
    update(value) { update = value; return this; },
    async order() { return { data: orders.filter(order => Object.entries(filters).every(([key, value]) => order[key] === value)) }; },
    async maybeSingle() {
      if (missingColumn) return { error: { code: '42703' } };
      const row = orders.find(order => Object.entries(filters).every(([key, value]) => order[key] === value));
      if (!row) return { data: null };
      assert.deepEqual(Object.keys(update).sort(), user === 'admin' ? ['fulfillment_status'] : ['receipt_status', 'receipt_updated_at']);
      Object.assign(row, update); return { data: { id: row.id, ...update } };
    },
  };
} };
const context = { exports: {}, require: () => ({
  checkoutUser: async () => { if (authFails) throw Error('Sign in required'); return { id: user }; }, paymentClient: () => db,
}) };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/actions/pharmacy-orders.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, context);
(async () => {
  const { getMyPharmacyOrders: list, confirmPharmacyOrderReceipt: save } = context.exports;
  const result = await list('token'); assert.equal(result.success, true); assert.equal(result.orders.length, 1); assert.equal(result.orders[0].id, 'order-a');
  assert.equal((await save('token', 'order-b', 'received')).success, false);
  assert.equal(orders[1].receipt_status, undefined);
  assert.equal((await save('token', 'order-a', 'delivered')).success, false);
  assert.equal((await save('token', 'order-a', 'received')).success, true);
  assert.equal(orders[0].receipt_status, 'received');
  assert.equal((await save('token', 'order-a', 'not_received')).success, true);
  assert.equal(orders[0].receipt_status, 'not_received');
  assert.equal(orders[0].status, 'Paid'); assert.equal(orders[0].total_amount, 2000); assert.equal(orders[0].fulfillment_status, 'pending');
  missingColumn = true; assert.match((await save('token', 'order-a', 'received')).error, /not enabled/);
  missingColumn = false;
  const dispatch = context.exports.updatePharmacyFulfillment;
  assert.equal((await dispatch('token', 'order-a', 'dispatched')).success, false);
  assert.equal(orders[0].fulfillment_status, 'pending');
  user = 'admin';
  assert.equal((await dispatch('token', 'order-a', 'invalid')).success, false);
  assert.equal((await dispatch('token', 'missing-order', 'dispatched')).success, false);
  assert.equal((await dispatch('token', 'order-a', 'dispatched')).success, true);
  assert.equal(orders[0].fulfillment_status, 'dispatched');
  assert.equal(orders[0].status, 'Paid');
  assert.equal(orders[0].receipt_status, 'not_received');
  user = 'patient-a';
  authFails = true; assert.equal((await list('token')).success, false); assert.equal((await save('token', 'order-a', 'received')).success, false);
  console.log('PASS: own-order listing, ownership checks, received/not-received updates, unchanged payment and fulfilment, missing migration, and signed-out rejection.');
})().catch(error => { console.error(error); process.exitCode = 1; });
