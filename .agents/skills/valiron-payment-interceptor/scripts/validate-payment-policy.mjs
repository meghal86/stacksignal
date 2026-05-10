#!/usr/bin/env node
import fs from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/validate-payment-policy.mjs <policy.json>');
  process.exit(1);
}

const required = [
  'route',
  'authorization',
  'allowedRails',
  'maxAmountPerPayment',
  'maxAmountPerHour',
  'maxAmountPerDay',
  'requireHumanApprovalOver',
  'fallbackMode',
];

const validRoutes = new Set(['prod', 'prod_throttled', 'sandbox', 'sandbox_only']);
const validAuth = new Set(['allow', 'allow_with_limits', 'restricted', 'deny']);
const validRails = new Set(['prod', 'sandbox']);
const validFallback = new Set(['fail-open-guarded', 'fail-closed']);

let data;
try {
  data = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (e) {
  console.error('Invalid JSON:', e.message);
  process.exit(1);
}

const entries = Array.isArray(data) ? data : [data];
let ok = true;

for (const [i, row] of entries.entries()) {
  for (const key of required) {
    if (!(key in row)) {
      console.error(`Entry ${i}: missing field ${key}`);
      ok = false;
    }
  }

  if (!validRoutes.has(row.route)) {
    console.error(`Entry ${i}: invalid route ${row.route}`);
    ok = false;
  }
  if (!validAuth.has(row.authorization)) {
    console.error(`Entry ${i}: invalid authorization ${row.authorization}`);
    ok = false;
  }

  if (!Array.isArray(row.allowedRails) || row.allowedRails.length === 0 || row.allowedRails.some((r) => !validRails.has(r))) {
    console.error(`Entry ${i}: allowedRails must be non-empty and contain only prod|sandbox`);
    ok = false;
  }

  for (const n of ['maxAmountPerPayment', 'maxAmountPerHour', 'maxAmountPerDay', 'requireHumanApprovalOver']) {
    if (typeof row[n] !== 'number' || row[n] < 0) {
      console.error(`Entry ${i}: ${n} must be a non-negative number`);
      ok = false;
    }
  }

  if (row.route === 'sandbox_only' && row.allowedRails.includes('prod')) {
    console.error(`Entry ${i}: sandbox_only cannot allow prod rail`);
    ok = false;
  }

  if (!validFallback.has(row.fallbackMode)) {
    console.error(`Entry ${i}: invalid fallbackMode ${row.fallbackMode}`);
    ok = false;
  }
}

if (!ok) process.exit(2);
console.log('Payment policy validation OK');
