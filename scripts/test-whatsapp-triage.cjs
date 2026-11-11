const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript'), assert = require('node:assert/strict');
let claim, operations, replies, generated, generationFail, sendFail, memoryFail;
const menuContext = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/lib/whatsapp-menu.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, menuContext);
const env = { WHATSAPP_APP_SECRET: 'secret', WHATSAPP_PHONE_NUMBER_ID: '12345', NEXT_PUBLIC_SUPABASE_URL: 'https://test.invalid', SUPABASE_SERVICE_ROLE_KEY: 'service-test' };
const reminderContext={exports:{},process:{env},Buffer,require};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/lib/whatsapp-reminder-core.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,reminderContext);
const context = { exports: {}, process: { env }, require(name) {
  if (name === 'server-only') return {};
  if (name === 'node:crypto') return require(name);
  if (name === './whatsapp-menu') return menuContext.exports;
  if (name === './whatsapp-reminder-core') return reminderContext.exports;
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
function reset() { claim = { state: 'claimed', history: [], consented:true,ai_turns:0 }; operations = []; replies = []; generated = []; generationFail = sendFail = memoryFail = false; }
(async () => {
  reset(); await handle(message);
  assert.deepEqual(operations.map(op => op.operation), ['claim', 'prepare', 'finish']);
  assert.match(replies[0].reply, /https:\/\/mobiledoc247.com/);
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
  reset(); claim.consented=false; await handle(message); assert.equal(generated.length,0); assert.equal(replies[0].reply,menuContext.exports.WHATSAPP_CONSENT);
  assert.equal(operations[1].clear_history,true); assert.equal(operations[1].user_text.includes('headache'),false);
  reset(); claim.consented=false; await handle({...message,text:'Yes, continue',selection:'md_consent'});
  assert.equal(operations[1].changes.consent,'accept'); assert.equal(generated.length,0);
  reset(); await handle({...message,text:'STOP'}); assert.equal(operations[1].changes.consent,'revoke'); assert.equal(operations[1].changes.stop_reminders,true);
  reset(); await handle({...message,text:'STOP REMINDERS'}); assert.equal(operations[1].changes.stop_reminders,true); assert.equal(generated.length,0);
  reset(); claim.ai_turns=4; await handle(message); assert.equal(generated.length,0); assert.equal(replies[0].reply,menuContext.exports.WHATSAPP_HANDOFF);
  reset(); await handle({...message,text:'Medication reminders',selection:'md_reminder'}); assert.match(replies[0].reply,/not available yet/); assert.equal(generated.length,0);
  env.WHATSAPP_REMINDER_ENCRYPTION_KEY='ab'.repeat(32); env.WHATSAPP_REMINDER_TEMPLATE='medication_reminder';env.WHATSAPP_REMINDER_TEMPLATE_LANGUAGE='en_US';
  reset(); await handle({...message,text:'Medication reminders',selection:'md_reminder'}); assert.match(replies[0].reply,/medicine name/);
  assert.equal(reminderContext.exports.decryptReminder(operations[1].changes.wizard).step,'medicine');
  reset(); claim.wizard=reminderContext.exports.encryptReminder({step:'medicine'});await handle({...message,text:'Example drug'});
  assert.equal(generated.length,0); assert.equal(operations[1].clear_history,true);assert.equal(operations[1].user_text.includes('drug'),false);
  reset();claim.wizard=reminderContext.exports.encryptReminder({step:'confirm',medicine:'Example medicine',dose:'As labelled',times:[480,1200],days:7});
  await handle({...message,text:'CONFIRM REMINDERS',selection:'md_reminder_confirm'});
  assert.equal(generated.length,0);assert.equal(operations[1].changes.wizard,null);
  const saved=operations[1].changes.create_reminder;assert.ok(saved.next_due);assert.equal(reminderContext.exports.decryptReminder(saved.payload).to,message.from);
  assert.equal(operations[1].clear_history,true);
  reset(); generationFail = true; await assert.rejects(() => handle(message), /GEMINI_HTTP_429/); assert.equal(operations.at(-1).operation, 'release'); assert.equal(replies.length, 0);
  reset(); sendFail = true; await assert.rejects(() => handle(message), /WHATSAPP_HTTP_500/); assert.equal(operations[1].operation, 'prepare'); assert.equal(operations.at(-1).operation, 'release');
  reset(); memoryFail = true; await assert.rejects(() => handle(message), /MEMORY_SETUP_REQUIRED/); assert.equal(generated.length, 0);
  console.log('PASS: memory, sender isolation, retries, consent/no-AI-before-acceptance, revocation, turn cap, website handoff, unavailable reminders, encrypted setup, confirmed schedule creation, reset, failures, and missing migration. No live messages sent.');
})().catch(error => { console.error(error); process.exitCode = 1; });
