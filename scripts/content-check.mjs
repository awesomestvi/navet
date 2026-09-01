#!/usr/bin/env node
import process from 'node:process';
import { checkContentPack, loadPack, parseCliArgs } from './content-workflow.mjs';

try {
  const options = parseCliArgs(process.argv.slice(2));
  if (!options.pack || options.pack === true) {
    throw new Error('Usage: pnpm marketing:content:check -- --pack <pack-directory>');
  }
  const { pack } = loadPack(options.pack);
  const result = checkContentPack(pack);
  for (const warning of result.warnings) console.warn(`warning: ${warning}`);
  if (result.errors.length > 0) {
    for (const error of result.errors) console.error(`error: ${error}`);
    throw new Error(`Content pack has ${result.errors.length} blocking item(s).`);
  }
  console.log('Content pack checks passed. Human review and manual publication are still required.');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
