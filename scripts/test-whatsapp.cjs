const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const crypto = require('node:crypto'), ts = require('typescript');
let calls = [];
const context = { exports: {}, Buffer, Date, Map, Promise, AbortSignal, process: { env: {
  GEMINI_API_KEY: 'test-gemini', WHATSAPP_ACCESS_TOKEN: 'test-meta', WHATSAPP_PHONE_NUMBER_ID: '123456',
} }, require: name => name === 'server-only' ? {} : require(name),
fetch: async (url, options) => {
  calls.push({ url, options });
  return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Hello!' }] } }] }) };
} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/lib/whatsapp.ts', 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, context);
const api = context.exports;
const message = { id: 'wamid.test', from: '2348012345678', timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: 'Hello' } };
const payload = { object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: {
  metadata: { phone_number_id: '123456' }, messages: [message],
} }] }] };
(async () => {
  const raw = JSON.stringify(payload), signature = 'sha256=' + crypto.createHmac('sha256', 'secret').update(raw).digest('hex');
  assert.equal(api.validWhatsAppSignature(raw, signature, 'secret'), true);
  assert.equal(api.validWhatsAppSignature(raw + ' ', signature, 'secret'), false);
  assert.equal(api.validWhatsAppSignature(raw, 'sha256=bad', 'secret'), false);
  assert.equal(api.validWhatsAppSignature(raw, signature, ''), false);
  assert.equal(api.incomingWhatsAppMessages(payload, '123456').length, 1);
  assert.equal(api.incomingWhatsAppMessages(payload, 'another').length, 0);
  const value = payload.entry[0].changes[0].value;
  value.messages = [{ ...message, type: 'image' }]; assert.equal(api.incomingWhatsAppMessages(payload, '123456').length, 0);
  value.messages = [{ ...message, timestamp: '1' }]; assert.equal(api.incomingWhatsAppMessages(payload, '123456').length, 0);
  value.messages = undefined; value.statuses = [{ status: 'delivered' }];
  assert.equal(api.incomingWhatsAppMessages(payload, '123456').length, 0);
  let sends = 0;
  await Promise.all([api.oncePerWhatsAppMessage('same', async () => { sends++; }), api.oncePerWhatsAppMessage('same', async () => { sends++; })]);
  await api.oncePerWhatsAppMessage('same', async () => { sends++; }); assert.equal(sends, 1);
  await assert.rejects(() => api.oncePerWhatsAppMessage('retry', async () => { throw Error('failure'); }));
  await api.oncePerWhatsAppMessage('retry', async () => { sends++; }); assert.equal(sends, 2);
  assert.equal(await api.generateWhatsAppReply('hello'), 'Hello!');
  assert.equal(calls[0].url.includes('test-gemini'), false);
  await api.sendWhatsAppReply(message.from, message.id, 'hello');
  const body = JSON.parse(calls[1].options.body);
  assert.equal(body.context.message_id, message.id); assert.equal(body.to, message.from); assert.equal(body.text.body, 'hello');
  context.fetch = async () => ({ ok: false, status: 401 });
  await assert.rejects(() => api.sendWhatsAppReply(message.from, message.id, 'hello'), /WHATSAPP_HTTP_401/);
  await assert.rejects(() => api.generateWhatsAppReply('hello'), /GEMINI_HTTP_401/);
  console.log('PASS: signature validation, recipient isolation, receipts/media/stale-message filtering, concurrent/repeated delivery deduplication, retries, Gemini generation, WhatsApp reply format, and API failures. No live messages sent.');
})().catch(error => { console.error(error); process.exitCode = 1; });
