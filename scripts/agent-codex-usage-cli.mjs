#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { observeCodexUsage } from './agent-codex-usage.mjs';

try {
  const [inputFile, ...extra] = process.argv.slice(2);
  if (!inputFile || extra.length) throw new Error('Usage: node scripts/agent-codex-usage-cli.mjs <private-input.json>');
  let input;
  try { input = JSON.parse(await readFile(inputFile, 'utf8')); }
  catch { throw new Error('Cannot read valid private usage input JSON.'); }
  console.log(JSON.stringify(await observeCodexUsage(input), null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
