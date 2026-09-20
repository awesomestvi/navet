import { describe, expect, it } from 'vitest';
import { pipelineImpact } from './pipeline-impact.mjs';
import { assertPipelineGate } from './pipeline-gate.mjs';
import { pagesAffected } from './pages-policy.mjs';
import { equivalentPagesInputs, pagesCheckState, requiredPagesChecks } from './pages-gate.mjs';
import { scopedRuleset } from './pipeline-rollout.mjs';

describe('dependency-aware pipeline routing', () => {
  it.each([
    'pnpm-lock.yaml',
    'package.json',
    'scripts/vite-host-conventions.ts',
    'packages/core/src/new.ts',
    'unknown-input',
  ])('fails closed for shared or unknown input %s', (file) => {
    expect(pipelineImpact([file])).toEqual({
      runtime: true,
      website: true,
      docs: true,
      demo: true,
      storybook: true,
    });
  });

  it('does not release the product for automation, docs or marketing changes', () => {
    expect(
      pipelineImpact(['.github/workflows/release.yml', '.changes/internal.yaml']).runtime,
    ).toBe(false);
    expect(pipelineImpact(['apps/docs/src/content/docs/start.mdx'])).toEqual({
      runtime: false,
      website: false,
      docs: true,
      demo: false,
      storybook: false,
    });
    expect(
      pipelineImpact(['packages/app/src/marketing/hooks/use-latest-github-release.ts']),
    ).toEqual({ runtime: false, website: true, docs: false, demo: false, storybook: false });
  });

  it('accepts only version-only add-on config changes as metadata', () => {
    const file = 'platform/home-assistant/addons/navet/config.yaml';
    const before = 'version: "0.17.1"\nports:\n  80/tcp: 80\n';
    const after = before.replace('0.17.1', '0.17.2');
    expect(pipelineImpact([file], (rev) => (rev === 'base' ? before : after)).runtime).toBe(false);
    expect(
      pipelineImpact([file], (rev) => (rev === 'base' ? before : after.replace('80/tcp', '81/tcp')))
        .runtime,
    ).toBe(true);
    expect(pipelineImpact([file]).runtime).toBe(true);
  });

  it('does not redeploy sites for a metadata PR, regardless of author', () => {
    const files = [
      '.changes/release-metadata.yaml',
      'platform/home-assistant/addons/navet-dev/config.yaml',
      'platform/home-assistant/addons/navet-dev/CHANGELOG.md',
    ];
    expect(pagesAffected(files)).toEqual({
      website: false,
      docs: false,
      demo: false,
      storybook: false,
    });
    expect(pagesAffected(['CHANGELOG.md'])).toEqual({
      website: true,
      docs: true,
      demo: false,
      storybook: false,
    });
  });
});

describe('required merge gate', () => {
  it('keeps all unrelated protections and refuses rollout without the aggregate gate', () => {
    const rule = {
      type: 'required_status_checks',
      parameters: {
        strict_required_status_checks_policy: true,
        required_status_checks: [
          { context: 'Product review gate', integration_id: 15368 },
          { context: 'Cloudflare Pages: navet', integration_id: 85455 },
          { context: 'Security', integration_id: 42 },
        ],
      },
    };
    const original = {
      name: 'main-published',
      target: 'branch',
      enforcement: 'active',
      bypass_actors: [],
      conditions: { ref_name: { include: ['refs/heads/main'] } },
      rules: [
        { type: 'pull_request', parameters: { required_review_thread_resolution: true } },
        rule,
      ],
    };
    const result = scopedRuleset(original);
    expect(result.rules[0]).toEqual(original.rules[0]);
    expect(result.bypass_actors).toEqual([]);
    expect(result.rules[1].parameters.required_status_checks.map((check) => check.context)).toEqual(
      ['Product review gate', 'Security'],
    );
    expect(result.rules[1].parameters.strict_required_status_checks_policy).toBe(true);
    expect(() => scopedRuleset({ ...original, rules: [] })).toThrow();
  });
  const needsFor = (runtime) => ({
    impact: {
      result: 'success',
      outputs: {
        runtime: String(runtime),
        website: 'false',
        docs: 'true',
        demo: String(runtime),
        storybook: String(runtime),
      },
    },
    quality: { result: 'success' },
    ...Object.fromEntries(
      [
        'tier-1-release-critical',
        'tier-2-blocking-app-contracts',
        'standalone-docker-smoke',
        'tier-3-broad-regression',
        'responsive-review',
      ].map((job) => [job, { result: runtime ? 'success' : 'skipped' }]),
    ),
  });
  it('accepts justified skips and successful applicable checks', () => {
    expect(() => assertPipelineGate(needsFor(false))).not.toThrow();
    expect(() => assertPipelineGate(needsFor(true))).not.toThrow();
  });
  it.each(['skipped', 'cancelled', 'failure', undefined])(
    'rejects an applicable lane with result %s',
    (result) => {
      const needs = needsFor(true);
      needs['standalone-docker-smoke'].result = result;
      expect(() => assertPipelineGate(needs)).toThrow();
    },
  );
  it('rejects classification failure and absent decisions', () => {
    const needs = needsFor(false);
    delete needs.impact.outputs.runtime;
    expect(() => assertPipelineGate(needs)).toThrow();
  });
  it('requires only affected previews, from the Cloudflare app and exact head', () => {
    const names = requiredPagesChecks({ docs: 'true', demo: 'false' });
    expect(names).toEqual(['Cloudflare Pages: navet-docs']);
    const check = {
      id: 1,
      name: names[0],
      head_sha: 'head',
      app: { id: 85455 },
      status: 'completed',
      conclusion: 'success',
    };
    expect(pagesCheckState([check], names, 'head')).toEqual(['success']);
    expect(pagesCheckState([check], names, 'other')).toEqual(['pending']);
    expect(pagesCheckState([{ ...check, app: { id: 1 } }], names, 'head')).toEqual(['pending']);
    expect(
      pagesCheckState([check, { ...check, id: 2, conclusion: 'failure' }], names, 'head'),
    ).toEqual(['failure']);
  });
  it('reuses ancestor previews only when the surface inputs are unchanged', () => {
    expect(equivalentPagesInputs('docs', ['.changes/note.yaml'])).toBe(true);
    expect(equivalentPagesInputs('docs', [])).toBe(true);
    expect(equivalentPagesInputs('docs', ['apps/docs/src/content/docs/start.mdx'])).toBe(false);
    expect(equivalentPagesInputs('docs', ['pnpm-lock.yaml'])).toBe(false);
    expect(equivalentPagesInputs('website', ['docs/README.md'])).toBe(true);
    expect(equivalentPagesInputs('website', ['CHANGELOG.md'])).toBe(false);
  });
});
