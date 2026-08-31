#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const repositoryRoot = resolve(import.meta.dirname, '..');
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'navet-ai-pi-'));
const bundlePath = join(temporaryDirectory, 'server.mjs');
const port = 18_100 + Math.floor(Math.random() * 1_000);
const dataDirectory = process.env.NAVET_AI_PI_DATA_DIRECTORY || join(temporaryDirectory, 'data');
const requireModel = process.env.NAVET_AI_PI_REQUIRE_MODEL === 'true';

function fail(message) {
  console.error(`Navet AI Pi acceptance failed: ${message}`);
  process.exitCode = 1;
}

function readRssMb(pid) {
  try {
    const status = readFileSync(`/proc/${pid}/status`, 'utf8');
    const match = status.match(/^VmRSS:\s+(\d+)\s+kB$/m);
    return match ? Number(match[1]) / 1024 : null;
  } catch {
    return null;
  }
}

const build = spawnSync(
  join(repositoryRoot, 'node_modules', '.bin', 'esbuild'),
  [
    'services/navet-ai/server.ts',
    '--bundle',
    '--platform=node',
    '--format=esm',
    `--outfile=${bundlePath}`,
    '--external:node:*',
  ],
  { cwd: repositoryRoot, encoding: 'utf8' }
);

if (build.status !== 0) {
  fail(build.stderr || build.stdout || 'service bundle could not be built');
} else {
  const service = spawn(process.execPath, [bundlePath], {
    env: {
      ...process.env,
      NAVET_AI_DATA_DIRECTORY: dataDirectory,
      NAVET_AI_MEMORY_GB: '4',
      NAVET_AI_PORT: String(port),
      NAVET_AI_LLAMA_CLI: process.env.NAVET_AI_LLAMA_CLI || '/usr/local/bin/llama-cli',
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let errors = '';
  service.stderr.on('data', (chunk) => {
    errors += String(chunk);
  });

  try {
    let initialState;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/__navet_ai__/state`);
        if (response.ok) {
          initialState = await response.json();
          break;
        }
      } catch {
        // The loopback listener is still starting.
      }
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
    }
    if (!initialState) throw new Error(`service did not start: ${errors}`);
    if (initialState.capabilities.model.selectedId !== 'qwen3.5-0.8b') {
      fail(`4 GB profile selected ${initialState.capabilities.model.selectedId}`);
    }
    if (requireModel && initialState.capabilities.model.status !== 'ready') {
      fail('NAVET_AI_PI_REQUIRE_MODEL=true but the 0.8B model is not ready');
    }

    const events = [21, 14, 7].map((daysAgo, index) => {
      const timestamp = new Date(Date.now() - daysAgo * 86_400_000);
      timestamp.setUTCHours(7, 2, 0, 0);
      return {
        id: `pi-check-${index}`,
        providerId: 'home_assistant',
        entityId: 'light.kitchen',
        canonicalEntityId: 'home_assistant:light.kitchen',
        domain: 'light',
        roomId: 'kitchen',
        action: 'turned_on',
        source: 'manual',
        timestamp: timestamp.toISOString(),
        previousState: 'off',
        currentState: 'on',
        context: { roomId: 'kitchen', occupancy: 'occupied' },
      };
    });
    await fetch(`http://127.0.0.1:${port}/__navet_ai__/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ events }),
    });
    const powerTimestamp = new Date().toISOString();
    const powerEvents = [420, 1_850, 900].map((currentState, index) => ({
      id: `pi-power-${index}`,
      providerId: 'home_assistant',
      entityId: 'sensor.power',
      canonicalEntityId: 'home_assistant:sensor.power',
      domain: 'sensor',
      action: 'energy_sampled',
      source: 'unknown',
      timestamp: new Date(Date.parse(powerTimestamp) + index * 1_000).toISOString(),
      currentState,
      context: { currentState },
    }));
    await fetch(`http://127.0.0.1:${port}/__navet_ai__/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ events: powerEvents }),
    });
    const startedAt = performance.now();
    const generationResponse = await fetch(`http://127.0.0.1:${port}/__navet_ai__/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale: 'en' }),
    });
    const generationMs = Math.round(performance.now() - startedAt);
    const generatedState = await generationResponse.json();
    if (!generationResponse.ok || generatedState.insights.length === 0) {
      fail('deterministic generation did not produce an insight');
    }
    const database = new DatabaseSync(join(dataDirectory, 'navet-ai.sqlite'), { readOnly: true });
    const aggregateBucketCount = Number(
      database.prepare('SELECT COUNT(*) AS count FROM aggregates').get().count
    );
    const hourlyPowerSampleCount = Number(
      database
        .prepare("SELECT COUNT(*) AS count FROM events WHERE observed_change = 'energy_sampled'")
        .get().count
    );
    const hourlyPowerMaximum = Number(
      JSON.parse(
        database
          .prepare("SELECT payload FROM events WHERE observed_change = 'energy_sampled'")
          .get().payload
      ).currentState
    );
    database.close();
    if (aggregateBucketCount === 0) fail('daily aggregate buckets were not persisted');
    if (hourlyPowerSampleCount !== 1 || hourlyPowerMaximum !== 1_850) {
      fail('power observations were not coalesced to one hourly maximum');
    }
    if (!requireModel && generationMs > 1_500) {
      fail(`deterministic generation took ${generationMs} ms (limit: 1500 ms)`);
    }
    const chatResponse = await fetch(`http://127.0.0.1:${port}/__navet_ai__/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: 'Turn on the office lights',
        locale: 'en',
        history: [],
        entities: [
          {
            id: 'home_assistant:light.office',
            providerId: 'home_assistant',
            name: 'Office light',
            room: 'Office',
            type: 'light',
            state: 'off',
          },
        ],
      }),
    });
    const chatResult = await chatResponse.json();
    if (
      !chatResponse.ok ||
      chatResult.readOnly !== true ||
      chatResult.executionRequested !== true ||
      chatResult.suggestions?.[0]?.operation !== 'turn_on' ||
      chatResult.suggestions?.[0]?.targets?.[0]?.id !== 'home_assistant:light.office'
    ) {
      fail('read-only chat did not return the expected control suggestion');
    }
    const stateQuestionResponse = await fetch(`http://127.0.0.1:${port}/__navet_ai__/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: 'How many lights are on in the office?',
        locale: 'en',
        history: [],
        entities: [
          {
            id: 'home_assistant:light.office',
            providerId: 'home_assistant',
            name: 'Office light',
            room: 'Office',
            type: 'light',
            state: 'on',
          },
        ],
      }),
    });
    const stateQuestionResult = await stateQuestionResponse.json();
    if (
      !stateQuestionResponse.ok ||
      stateQuestionResult.readOnly !== true ||
      stateQuestionResult.executionRequested !== false ||
      stateQuestionResult.answer?.kind !== 'lights_on_count' ||
      stateQuestionResult.answer?.count !== 1 ||
      stateQuestionResult.answer?.room !== 'Office'
    ) {
      fail('read-only chat did not answer the expected light state question');
    }
    const rssMb = readRssMb(service.pid);
    const rssLimitMb = requireModel ? 2_800 : 256;
    if (rssMb !== null && rssMb > rssLimitMb) {
      fail(`server and AI used ${rssMb.toFixed(1)} MB RSS (limit: ${rssLimitMb} MB)`);
    }
    if (!process.exitCode) {
      console.log(
        JSON.stringify(
          {
            passed: true,
            profileMemoryGb: 4,
            selectedModel: initialState.capabilities.model.selectedId,
            modelReady: initialState.capabilities.model.status === 'ready',
            generationMs,
            aggregateBucketCount,
            chatSuggestion: chatResult.suggestions?.[0]?.operation ?? 'missing',
            chatStateAnswer: stateQuestionResult.answer?.count ?? 'missing',
            serviceAndAiRssMb: rssMb === null ? 'unavailable' : Number(rssMb.toFixed(1)),
            browserIncluded: false,
          },
          null,
          2
        )
      );
    }
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  } finally {
    service.kill('SIGTERM');
    if (!process.env.NAVET_AI_PI_DATA_DIRECTORY) rmSync(temporaryDirectory, { recursive: true });
  }
}
