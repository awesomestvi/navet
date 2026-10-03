#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { AgentTaskStore } from './agent-task-store.mjs';

// Use a file for sensitive inputs; do not put proposal contents or credentials in shell args.
const [directory, action, inputFile] = process.argv.slice(2);
if (!directory || !action || !['list', 'enqueue', 'mutate'].includes(action)
  || (action !== 'list' && !inputFile)) {
  console.error('Usage: node scripts/agent-task.mjs <private-state-directory> <list|enqueue|mutate> [input.json]');
  process.exitCode = 1;
} else {
  try {
    const store = new AgentTaskStore(path.resolve(directory));
    const input = action === 'list' ? null : JSON.parse(await readFile(inputFile, 'utf8'));
    const result = action === 'list' ? await store.list() : action === 'enqueue'
      ? await store.enqueue(input) : await store.mutate(input.id, input.action, input.input);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
