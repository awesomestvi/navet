import { pathToFileURL } from 'node:url';

export function assertPipelineGate(needs) {
  if (needs.impact?.result !== 'success' || needs.quality?.result !== 'success') {
    throw new Error('Impact analysis and quality checks must succeed.');
  }
  const outputs = needs.impact.outputs;
  for (const key of ['runtime', 'website', 'docs', 'demo', 'storybook']) {
    if (!['true', 'false'].includes(outputs?.[key]))
      throw new Error(`Missing impact decision: ${key}`);
  }
  const expected = {
    'tier-1-release-critical': outputs.runtime === 'true',
    'tier-2-blocking-app-contracts': outputs.runtime === 'true',
    'standalone-docker-smoke': outputs.runtime === 'true',
    'tier-3-broad-regression': outputs.runtime === 'true',
    'responsive-review': outputs.runtime === 'true' || outputs.demo === 'true',
  };
  for (const [job, required] of Object.entries(expected)) {
    const actual = needs[job]?.result;
    if (actual !== (required ? 'success' : 'skipped')) {
      throw new Error(`${job}: expected ${required ? 'success' : 'skipped'}, received ${actual}`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assertPipelineGate(JSON.parse(process.env.NEEDS_JSON));
  console.log('All applicable deterministic gates passed.');
}
