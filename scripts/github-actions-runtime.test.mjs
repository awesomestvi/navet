import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

const minimumNode24Major = new Map([
  ['actions/checkout', 5],
  ['actions/create-github-app-token', 3],
  ['actions/download-artifact', 7],
  ['actions/github-script', 8],
  ['actions/setup-node', 7],
  ['actions/upload-artifact', 6],
  ['docker/build-push-action', 7],
  ['docker/login-action', 4],
  ['docker/setup-buildx-action', 4],
  ['docker/setup-qemu-action', 4],
  ['pnpm/action-setup', 6],
  ['softprops/action-gh-release', 3],
]);

// Verified upstream commits for actions pinned by the workflow security policy.
const pinnedMajors = new Map([
  ['docker/build-push-action@c3c9e263c25d99ce0380d002d59b67737d91b0dc', 7],
  ['docker/login-action@dbcb813823bdd20940b903addbd779551569679f', 4],
  ['docker/setup-buildx-action@f87e5991a6d7451dcb8d9637bfbc97413f497069', 4],
  ['docker/setup-qemu-action@99012661954931238ded8c8b007157a8430204e1', 4],
  ['pnpm/action-setup@0977fd99725f1db4007ccb2928dbb4e90d06cc86', 6],
  ['softprops/action-gh-release@efb35369e0ad2afab669f228072c1b0d510eae64', 3],
]);

describe('GitHub Actions JavaScript runtimes', () => {
  it('uses Node 24-compatible majors for every audited external action', () => {
    const workflowDirectory = resolve(process.cwd(), '.github/workflows');
    const findings = [];
    const seen = new Set();

    for (const file of readdirSync(workflowDirectory).filter((entry) => entry.endsWith('.yml'))) {
      const contents = readFileSync(resolve(workflowDirectory, file), 'utf8');
      for (const match of contents.matchAll(/uses:\s+([^@\s]+)@([a-zA-Z0-9.-]+)/g)) {
        const [, action, reference] = match;
        const minimum = minimumNode24Major.get(action);
        if (!minimum) continue;
        seen.add(action);
        const major = /^v\d+$/.test(reference)
          ? Number(reference.slice(1))
          : pinnedMajors.get(`${action}@${reference}`);
        if (!major || major < minimum) {
          findings.push(`${file}: ${action}@${reference} must resolve to v${minimum} or newer`);
        }
      }
    }

    expect([...seen].sort()).toEqual([...minimumNode24Major.keys()].sort());
    expect(findings).toEqual([]);
  });

  it('keeps the Navet build runtime on Node 22 without enabling implicit caching', () => {
    const workflowDirectory = resolve(process.cwd(), '.github/workflows');
    const setupSteps = readdirSync(workflowDirectory)
      .filter((entry) => entry.endsWith('.yml'))
      .flatMap((file) => {
        const workflow = parse(readFileSync(resolve(workflowDirectory, file), 'utf8'));
        return Object.values(workflow.jobs ?? {}).flatMap((job) => job.steps ?? []);
      })
      .filter((step) => /^actions\/setup-node@v\d+$/.test(step.uses ?? ''));

    expect(setupSteps.length).toBeGreaterThan(0);
    for (const step of setupSteps) {
      expect(step.with?.['node-version']).toBe(22);
      expect(step.with?.['package-manager-cache']).toBe(false);
    }
  });

  it('uses the supported GitHub App client ID input', () => {
    const workflowDirectory = resolve(process.cwd(), '.github/workflows');
    const tokenSteps = readdirSync(workflowDirectory)
      .filter((entry) => entry.endsWith('.yml') || entry.endsWith('.yaml'))
      .flatMap((file) => {
        const workflow = parse(readFileSync(resolve(workflowDirectory, file), 'utf8'));
        return Object.values(workflow.jobs ?? {}).flatMap((job) => job.steps ?? []);
      })
      .filter((step) => step.uses === 'actions/create-github-app-token@v3');

    expect(tokenSteps.length).toBeGreaterThan(0);
    for (const step of tokenSteps) {
      expect(step.with?.['client-id']).toBeTruthy();
      expect(step.with?.['app-id']).toBeUndefined();
    }
  });
});
