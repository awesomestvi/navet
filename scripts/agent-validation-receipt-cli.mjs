#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { verifyValidationReceipt } from './agent-validation-receipt.mjs';

try {
  const [inputFile, ...extra] = process.argv.slice(2);
  if (!inputFile || extra.length) throw new Error('Usage: node scripts/agent-validation-receipt-cli.mjs <private-input.json>');
  let input;
  try { input = JSON.parse(await readFile(inputFile, 'utf8')); }
  catch { throw new Error('Cannot read valid private validation input JSON.'); }
  console.log(JSON.stringify(await verifyValidationReceipt(input), null, 2));
} catch (error) {
  console.error(error.code ? 'Native receipt or checkout evidence is unavailable.' : error.message);
  process.exitCode = 1;
}
