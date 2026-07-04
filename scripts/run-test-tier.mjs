#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { TEST_TIER_CONFIG, TEST_TIERS } from './test-tier-manifest.mjs';

const [tierName, ...extraArgs] = process.argv.slice(2);
const tier = TEST_TIERS[tierName];

if (!tier) {
  const tierNames = Object.keys(TEST_TIERS).join(', ');
  console.error(`Unknown test tier "${tierName ?? ''}". Expected one of: ${tierNames}`);
  process.exit(1);
}

const missingFiles = tier.files.filter((file) => !fs.existsSync(file));

if (missingFiles.length > 0) {
  console.error(`Test tier ${tierName} references missing files:`);
  for (const file of missingFiles) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

const args = [
  'vitest',
  '--config',
  TEST_TIER_CONFIG.config,
  '--project',
  TEST_TIER_CONFIG.project,
];

if (tier.files.length > 0) {
  args.push('--run', ...tier.files);
}

const passthroughArgs = extraArgs[0] === '--' ? extraArgs.slice(1) : extraArgs;
args.push(...passthroughArgs);

const result = spawnSync('pnpm', ['exec', ...args], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
