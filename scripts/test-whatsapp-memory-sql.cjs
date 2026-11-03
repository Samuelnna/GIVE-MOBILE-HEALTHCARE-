// Requires an optional local @electric-sql/pglite install; no live DB credentials.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { PGlite } = require(process.env.PGLITE_TEST_PATH || path.resolve('.codex/whatsapp-sql-check-local/node_modules/@electric-sql/pglite'));
(async () => {
  const db = new PGlite();
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;');
  const migration = fs.readFileSync('whatsapp_triage_memory.sql', 'utf8');
  await db.exec(migration); await db.exec(migration);
  const session = 'a'.repeat(64), other = 'b'.repeat(64), lease = '00000000-0000-4000-8000-000000000001', lease2 = '00000000-0000-4000-8000-000000000002';
  const call = async (operation, id, extra = {}, key = session, token = lease) => {
    const { rows } = await db.query('SELECT public.whatsapp_triage_turn($1,$2,$3,$4,$5,$6,$7) AS result',
      [operation, key, id, token, extra.user || null, extra.reply || null, extra.reset || false]);
    return rows[0].result;
  };
  for (const role of ['anon', 'authenticated']) {
    await db.exec('SET ROLE ' + role);
    await assert.rejects(() => call('claim', 'denied'), /permission denied/);
    await assert.rejects(() => db.query('SELECT * FROM public.whatsapp_triage_sessions'), /permission denied/);
    await db.exec('RESET ROLE');
  }
  await db.exec('SET ROLE service_role');
  assert.equal((await call('claim', 'm1')).state, 'claimed');
  assert.equal((await call('claim', 'm1', {}, session, lease2)).state, 'busy');
  assert.equal((await call('claim', 'm2', {}, session, lease2)).state, 'busy');
  await call('prepare', 'm1', { user: 'Headache', reply: 'How long?' });
  await call('release', 'm1');
  const retry = await call('claim', 'm1'); assert.equal(retry.reply, 'How long?'); assert.equal(retry.history.length, 2);
  await call('prepare', 'm1', { user: 'Should not append', reply: 'Duplicate' });
  await call('finish', 'm1'); assert.equal((await call('claim', 'm1')).state, 'sent');
  const next = await call('claim', 'm2'); assert.equal(next.history.length, 2); assert.equal(next.history[0].text, 'Headache');
  await call('prepare', 'm2', { user: 'Two days', reply: 'Any other symptoms?' }); await call('finish', 'm2');
  assert.equal((await call('claim', 'other', {}, other)).history.length, 0); await call('release', 'other', {}, other);
  // A failed generation leaves no prepared response, so it must not block new messages.
  await call('claim', 'failed'); await call('release', 'failed');
  await call('claim', 'new'); await call('release', 'new');
  for (let i = 0; i < 15; i++) { const id = 'turn' + i; await call('claim', id); await call('prepare', id, { user: 'User ' + i, reply: 'Model ' + i }); await call('finish', id); }
  const bounded = await call('claim', 'bounded'); assert.equal(bounded.history.length, 20); assert.equal(bounded.history[0].text, 'User 5');
  await call('release', 'bounded');
  await call('claim', 'reset'); await call('prepare', 'reset', { user: 'RESET', reply: 'Cleared', reset: true }); await call('finish', 'reset');
  const afterReset = await call('claim', 'afterReset'); assert.equal(afterReset.history.length, 0);
  const scrubbed = await db.query("SELECT count(*)::int AS count FROM public.whatsapp_triage_deliveries WHERE conversation_key = $1 AND sent AND message_id <> 'reset' AND reply IS NOT NULL", [session]);
  assert.equal(scrubbed.rows[0].count, 0); await call('release', 'afterReset');
  await db.query("UPDATE public.whatsapp_triage_sessions SET expires_at=now()-interval '1 second',locked_until=now()-interval '1 second' WHERE conversation_key=$1", [session]);
  assert.equal((await call('claim', 'expired')).history.length, 0);
  const oldReceipts = await db.query('SELECT count(*)::int AS count FROM public.whatsapp_triage_deliveries WHERE message_id=$1', ['m1']);
  assert.equal(oldReceipts.rows[0].count, 0);
  await assert.rejects(() => call('finish', 'expired', {}, session, lease2), /lease expired/);
  await db.close();
  console.log('PASS: real Postgres migration/re-run, service-role-only access, sender serialization, retry caching, idempotent history, sender isolation, failed-turn recovery, bounded memory, reset erasure, expiry cleanup, and lease ownership.');
})().catch(error => { console.error(error); process.exitCode = 1; });
