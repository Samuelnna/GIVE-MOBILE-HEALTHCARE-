const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), ts = require('typescript');
let userId = 'patient', allowed = true, writes = 0;
let call = { id: 'call', caller_id: 'patient', callee_id: 'professional', status: 'ringing', created_at: new Date().toISOString() };
const db = { from(table) { let mutation; return {
  select() { return this; }, eq() { return this; },
  in: async () => ({ data: [{ id: 'patient', full_name: 'Patient' }, { id: 'professional', full_name: 'Professional' }] }),
  insert(value) { mutation = value; return this; }, update(value) { mutation = value; return this; },
  async single() { if (mutation) { writes++; call = { ...call, ...mutation }; } return { data: call }; },
  async maybeSingle() { return this.single(); },
} } };
const context = { exports: {}, process: { env: {} }, require(name) {
  if (name === '@supabase/supabase-js') return { createClient: () => ({ rpc: async () => ({ data: allowed }) }) };
  return { checkoutUser: async () => ({ id: userId }), paymentClient: () => db };
} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/actions/calls.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, context);
(async () => {
  const { startConsultationCall: start, updateConsultationCall: change } = context.exports;
  allowed = false;
  assert.equal((await start('token', 'professional')).success, false);
  assert.equal(writes, 0);
  allowed = true;
  assert.equal((await start('token', 'professional', undefined, 'audio')).success, true);
  assert.equal(call.mode, 'audio');
  assert.equal((await change('token', 'call', 'accepted')).success, false); // caller cannot answer
  userId = 'stranger';
  assert.equal((await change('token', 'call', 'ended')).success, false);
  userId = 'professional';
  call.created_at = new Date(Date.now() - 61000).toISOString();
  assert.equal((await change('token', 'call', 'accepted')).success, false);
  call.created_at = new Date().toISOString(); allowed = false;
  assert.equal((await change('token', 'call', 'accepted')).success, false);
  allowed = true;
  assert.equal((await change('token', 'call', 'accepted')).success, true);
  assert.equal(call.status, 'accepted');
  assert.equal((await change('token', 'call', 'declined')).success, false);
  userId = 'patient';
  assert.equal((await change('token', 'call', 'ended')).success, true);
  assert.equal(call.status, 'ended');
  console.log('PASS: paid call access, voice mode, recipient-only answers, stranger rejection, expiry, access recheck, accepted call, and participant hangup.');
})().catch(error => { console.error(error); process.exitCode = 1; });
