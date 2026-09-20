import { describe, expect, it } from 'vitest';
import { TEST_TIERS } from './test-tier-manifest.mjs';
import { testTierArgs } from './test-tier-args.mjs';

describe('CI test partition', () => {
  it('keeps the local broad regression command complete', () => {
    expect(testTierArgs('tier3')).toContain('--run');
    expect(testTierArgs('tier3')).not.toContain('--exclude');
  });
  it('excludes exactly the test files owned by the other required lanes', () => {
    const args = testTierArgs('tier3', ['--', '--exclude-blocking', '--reporter=dot']);
    const excluded = args.flatMap((value, index) =>
      value === '--exclude' ? [args[index + 1]] : [],
    );
    expect(excluded).toEqual([...new Set([...TEST_TIERS.tier1.files, ...TEST_TIERS.tier2.files])]);
    expect(args).toContain('--reporter=dot');
    expect(args).not.toContain('--exclude-blocking');
    expect(excluded).not.toContain('scripts/pipeline-impact.test.mjs');
  });
  it.each(['tier1', 'tier2'])('does not allow excluding critical coverage from %s', (tier) => {
    expect(() => testTierArgs(tier, ['--exclude-blocking'])).toThrow();
    expect(testTierArgs(tier)).toEqual(expect.arrayContaining(TEST_TIERS[tier].files));
  });
});
