// Dry run by default. --apply records individually verified successful charges.
// Prints aggregate numbers only; never keys, customer data, or transaction references.
require('@next/env').loadEnvConfig(process.cwd());
const fs = require('node:fs'), Module = require('node:module'), ts = require('typescript');
const originalLoad = Module._load;
Module._load = function(name, ...args) {
  if (name === 'server-only') return {};
  return originalLoad.call(this, name, ...args);
};
require.extensions['.ts'] = function(module, filename) {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, filename);
};
const { reconcileGatewayPayments, paymentRows } = require('../app/lib/payment-reconciliation.ts');
(async () => {
  const apply = process.argv.includes('--apply');
  const result = await reconcileGatewayPayments(apply);
  const rows = await paymentRows();
  const paid = rows.filter(row => ['successful', 'completed'].includes(row.status));
  console.log(JSON.stringify({ mode: apply ? 'applied' : 'dry-run', ...result,
    savedSuccessfulPayments: paid.length,
    savedNGNVolume: paid.filter(row => !row.currency || row.currency === 'NGN').reduce((sum, row) => sum + Number(row.amount), 0),
    unclassifiedPayments: paid.filter(row => row.payment_type === 'gateway_unclassified').length,
  }));
  if (result.failed) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
