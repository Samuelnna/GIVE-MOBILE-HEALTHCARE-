const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), ts = require('typescript');
const context = { exports: {}, Intl, Date };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/traction.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, context);
const current = '2026-10-10T12:00:00Z', old = '2026-01-01T12:00:00Z';
const input = {
  accounts: [{ id: 'a', created_at: current }, { id: 'b', created_at: old }],
  profiles: [{ id: 'a', user_type: 'patient', created_at: current }, { id: 'b', user_type: 'patient', created_at: old }, { id: 'pro', user_type: 'professional', status: 'active', created_at: old }],
  payments: [
    { user_id: 'a', amount: 1000, currency: 'NGN', payment_type: 'doctor_consultation', status: 'successful', created_at: current },
    { user_id: 'a', amount: 2000, currency: 'NGN', payment_type: 'pharmacy_order', status: 'successful', created_at: current },
    { user_id: 'b', amount: 99999, currency: 'NGN', status: 'pending', created_at: current },
    { user_id: 'b', amount: 500, currency: 'USD', status: 'successful', created_at: current },
    { user_id: 'b', amount: 99999, currency: 'NGN', status: 'failed', created_at: current },
    { user_id: 'b', amount: 1000, currency: 'NGN', payment_type: 'doctor_consultation', status: 'successful', created_at: old },
  ],
  appointments: [{ status: 'Completed', created_at: current }, { status: 'Pending', created_at: current }, { status: 'Completed', created_at: old }],
  orders: [{ fulfillment_status: 'delivered', receipt_status: 'received', created_at: current }, { fulfillment_status: 'pending', created_at: current }],
  cart: [{ user_id: 'a', quantity: 2 }, { user_id: 'a', quantity: 3 }],
  cartEvents: [{ quantity: 7, created_at: current }, { quantity: 9, created_at: old }],
  triage: [{ patient_id: 'a', record_type: 'Triage', created_at: current }, { patient_id: 'a', record_type: 'Other', created_at: current }],
  rates: { doctor_share: .7, pharmacy_share: .9 }, trackingStartedAt: current, missing: [],
};
const summarize = context.exports.summarizeTraction, now = new Date('2026-10-20T12:00:00Z');
const report = summarize(input, '30', now);
assert.equal(report.signups, 1); assert.equal(report.lifetimePatients, 2); assert.equal(report.activeProfessionals, 1);
assert.equal(report.gross, 3000); assert.ok(Math.abs(report.estimatedShare - 500) < .01);
assert.equal(report.completedOrders, 1); assert.equal(report.orderCompletionRate, 50);
assert.equal(report.completedConsultations, 1); assert.equal(report.appointments, 2);
assert.equal(report.otherCurrencyPayments, 1); assert.equal(report.repeatPatients, 1); assert.equal(report.payingPatients, 2);
assert.equal(report.currentCartUnits, 5); assert.equal(report.currentCartUsers, 1); assert.equal(report.cartAddedUnits, 7);
assert.equal(report.triageReports, 1); assert.equal(report.triageUsers, 1);
assert.equal(report.chart.length, 6); assert.equal(report.chart.reduce((total, month) => total + month.payments, 0), 3000);
assert.equal(summarize(input, 'all', now).gross, 4000);
assert.equal(summarize(input, 'all', now).completedConsultations, 2);
const empty = summarize({ ...input, accounts: [], payments: [], orders: [], missing: ['Payments'] }, '30', now);
assert.equal(empty.orderCompletionRate, 0); assert.ok(empty.missing.includes('Payments'));
let reads = 0;
const actionContext = { exports: {}, require(name) {
  if (name.includes('traction')) return { summarizeTraction: summarize };
  return { checkoutUser: async () => ({ id: 'patient' }), paymentClient: () => ({ from() { reads++; return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: { user_type: 'patient', status: 'active' } }) }; } }) };
} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/actions/admin-traction.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, actionContext);
(async () => {
  const result = await actionContext.exports.getAdminTraction('token', 'all');
  assert.equal(result.success, false); assert.equal(reads, 1);
  console.log('PASS: date filtering, currency isolation, gross/share distinction, unique users, repeat payers, completed-order deduplication, saved triage counts, current vs historical carts, source failures, and non-admin denial.');
})().catch(error => { console.error(error); process.exitCode = 1; });
