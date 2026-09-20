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

describe('GitHub Actions JavaScript runtimes', () => {
  it('uses Node 24-compatible majors for every audited external action', () => {
    const workflowDirectory = resolve(process.cwd(), '.github/workflows');
    const findings = [];
    const seen = new Set();

    for (const file of readdirSync(workflowDirectory).filter((entry) => entry.endsWith('.yml'))) {
      const contents = readFileSync(resolve(workflowDirectory, file), 'utf8');
      for (const match of contents.matchAll(/uses:\s+([^@\s]+)@v(\d+)/g)) {
        const [, action, rawMajor] = match;
        const minimum = minimumNode24Major.get(action);
        if (!minimum) continue;
        seen.add(action);
        if (Number(rawMajor) < minimum) {
          findings.push(`${file}: ${action}@v${rawMajor} must be v${minimum} or newer`);
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
      .filter((entry) => entry.endsWith('.yml'))
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
