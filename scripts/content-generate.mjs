#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { generateContentPack, parseCliArgs, repoRoot } from './content-workflow.mjs';

try {
  const options = parseCliArgs(process.argv.slice(2));
  if (!options.brief || options.brief === true) {
    throw new Error('Usage: pnpm marketing:content:generate -- --brief <brief.yml> [--output <dir>]');
  }

  const result = await generateContentPack({
    briefPath: options.brief,
    outputPath: options.output === true ? undefined : options.output,
  });
  console.log(`Generated content pack at ${path.relative(repoRoot, result.outputPath)}.`);
  console.log(`Generation mode: ${result.pack.generator.mode}.`);
  console.log(`Publish eligible after human review: ${result.pack.publishEligible ? 'yes' : 'no'}.`);
  if (result.pack.errors.length > 0) {
    console.log(`Review ${result.pack.errors.length} blocking item(s) in review.md.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
