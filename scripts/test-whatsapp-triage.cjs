const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript'), assert = require('node:assert/strict');
let claim, operations, replies, generated, generationFail, sendFail, memoryFail;
const menuContext = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/lib/whatsapp-menu.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, menuContext);
const env = { WHATSAPP_APP_SECRET: 'secret', WHATSAPP_PHONE_NUMBER_ID: '12345', NEXT_PUBLIC_SUPABASE_URL: 'https://test.invalid', SUPABASE_SERVICE_ROLE_KEY: 'service-test' };
const context = { exports: {}, process: { env }, require(name) {
  if (name === 'server-only') return {};
  if (name === 'node:crypto') return require(name);
  if (name === './whatsapp-menu') return menuContext.exports;
  if (name === '@supabase/supabase-js') return { createClient: () => ({ rpc: async (_name, args) => {
    operations.push(args);
    return memoryFail ? { error: { code: 'PGRST202' } } : { data: args.operation === 'claim' ? claim : { state: 'ok' } };
  } }) };
  return {
    generateWhatsAppReply: async (text, history) => { generated.push({ text, history }); if (generationFail) throw Error('GEMINI_HTTP_429'); return 'How long have you had the headache?'; },
    sendWhatsAppReply: async (to, id, reply) => { if (sendFail) throw Error('WHATSAPP_HTTP_500'); replies.push({ to, id, reply }); },
  };
} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/lib/whatsapp-triage.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, context);
const { handleWhatsAppTriage: handle, whatsappConversationKey: key } = context.exports;
const message = { from: '2348012345678', id: 'wamid.1', text: 'I have a headache', timestamp: Date.now() };
function reset() { claim = { state: 'claimed', history: [] }; operations = []; replies = []; generated = []; generationFail = sendFail = memoryFail = false; }
(async () => {
  reset(); await handle(message);
  assert.deepEqual(operations.map(op => op.operation), ['claim', 'prepare', 'finish']);
  assert.match(replies[0].reply, /RESET/); assert.match(replies[0].reply, /24 hours/);
  assert.equal(operations[0].session_key.length, 64); assert.equal(operations[0].session_key.includes(message.from), false);
  assert.notEqual(key(message.from), key('2348099999999'));
  const firstKey = key(message.from); env.WHATSAPP_PHONE_NUMBER_ID = 'another'; assert.notEqual(firstKey, key(message.from)); env.WHATSAPP_PHONE_NUMBER_ID = '12345';
  reset(); claim.history = [{ role: 'user', text: 'Headache' }, { role: 'model', text: 'How long?' }];
  await handle({ ...message, text: 'Two days' }); assert.equal(generated[0].history.length, 2); assert.equal(replies[0].reply.includes('24 hours'), false);
  reset(); claim.state = 'sent'; await handle(message); assert.equal(replies.length, 0); assert.equal(generated.length, 0);
  reset(); claim.state = 'busy'; await assert.rejects(() => handle(message), /CONVERSATION_BUSY/); assert.equal(generated.length, 0);
  reset(); claim.reply = 'Cached assessment'; await handle(message); assert.equal(generated.length, 0); assert.equal(replies[0].reply, 'Cached assessment');
  reset(); await handle({ ...message, text: 'RESET' }); assert.equal(generated.length, 0); assert.equal(operations[1].clear_history, true); assert.match(replies[0].reply, /cleared/);
  reset(); await handle({ ...message, text: 'Hi' }); assert.equal(generated.length, 0); assert.match(replies[0].reply, /Welcome to MobileDoc/);
  assert.equal(operations[1].clear_history, false);
  reset(); await handle({ ...message, text: 'Check symptoms', selection: 'md_symptoms' });
  assert.equal(generated.length, 0); assert.match(replies[0].reply, /What symptoms/);
  reset(); await handle({ ...message, text: 'Ask a health question', selection: 'md_question' });
  assert.equal(generated.length, 0); assert.match(replies[0].reply, /Ask your health question/);
  reset(); await handle({ ...message, text: 'Find a doctor', selection: 'md_doctor' });
  assert.equal(generated.length, 0); assert.match(replies[0].reply, /https:\/\/mobiledoc247.com/); assert.match(replies[0].reply, /haven’t booked/);
  reset(); claim.reply = menuContext.exports.WHATSAPP_WELCOME; await handle(message);
  assert.equal(generated.length, 0); assert.equal(replies[0].reply, menuContext.exports.WHATSAPP_WELCOME);
  reset(); generationFail = true; await assert.rejects(() => handle(message), /GEMINI_HTTP_429/); assert.equal(operations.at(-1).operation, 'release'); assert.equal(replies.length, 0);
  reset(); sendFail = true; await assert.rejects(() => handle(message), /WHATSAPP_HTTP_500/); assert.equal(operations[1].operation, 'prepare'); assert.equal(operations.at(-1).operation, 'release');
  reset(); memoryFail = true; await assert.rejects(() => handle(message), /MEMORY_SETUP_REQUIRED/); assert.equal(generated.length, 0);
  console.log('PASS: persistent-memory orchestration, hashed sender isolation, context follow-up, duplicate suppression, sender locks, cached-answer retry, reset, privacy notice, API failure release, and missing migration. No live messages sent.');
})().catch(error => { console.error(error); process.exitCode = 1; });
