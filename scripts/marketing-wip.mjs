#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { marketingWipRoot, parseCliArgs, repoRoot } from './content-workflow.mjs';

const AREAS = new Set(['community', 'tutorials', 'videos']);
const TASK_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export function resolveMarketingWipTask(area, id) {
  if (!AREAS.has(area)) {
    throw new Error(`Unknown WIP area "${area}". Use community, tutorials, or videos.`);
  }
  if (!TASK_ID_PATTERN.test(id ?? '')) {
    throw new Error('WIP task id must use lowercase letters, numbers, and hyphens.');
  }

  const areaRoot = path.join(marketingWipRoot, area);
  const taskPath = path.join(areaRoot, id);
  if (path.dirname(taskPath) !== areaRoot) {
    throw new Error('WIP cleanup may target only one direct task directory.');
  }
  return taskPath;
}

export function cleanMarketingWipTask({ area, id, dryRun = false }) {
  const taskPath = resolveMarketingWipTask(area, id);
  if (!fs.existsSync(taskPath)) {
    throw new Error(`WIP task does not exist: ${path.relative(repoRoot, taskPath)}`);
  }
  if (!dryRun) fs.rmSync(taskPath, { recursive: true });
  return { taskPath, removed: !dryRun };
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [command, ...arguments_] = process.argv.slice(2);
  const options = parseCliArgs(arguments_);

  if (command !== 'clean') {
    console.error('Usage: pnpm marketing:wip:clean -- --area <area> --id <task-id> [--dry-run]');
    process.exitCode = 1;
  } else {
    try {
      const result = cleanMarketingWipTask({
        area: options.area,
        id: options.id,
        dryRun: options['dry-run'] === true,
      });
      const relativePath = path.relative(repoRoot, result.taskPath);
      console.log(result.removed ? `Removed ${relativePath}.` : `Would remove ${relativePath}.`);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
}
