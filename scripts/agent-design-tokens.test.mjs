import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { findDesignTokens, generateDesignTokens } from './agent-design-tokens.mjs';

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'navet-token-export-'));
  writeFileSync(path.join(root, 'index.ts'), "export { tokens } from './tokens';");
  return { root, input: { root, file: 'index.ts' }, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

describe('source-derived design token exchange', () => {
  it('exports dimensions, durations and scales with real alias values and omission provenance', () => {
    const { root, input, cleanup } = fixture();
    try {
      writeFileSync(path.join(root, 'base.ts'), 'export const compact = 36 as const;');
      writeFileSync(path.join(root, 'tokens.ts'), `
        import { compact } from './base';
        export const tokens = {
          controlHeightPx: compact, fontScale: 0.94,
          durationsMs: { instant: 0, fast: 120 },
          surfaceClassName: 'bg-white/10', reduceMotion: true,
          focus: (color: string) => ({ borderColor: color }),
        } as const;
      `);
      const first = generateDesignTokens(input);
      expect(first.tokens.controlHeightPx).toMatchObject({ $type: 'dimension', $value: { value: 36, unit: 'px' } });
      expect(first.tokens.fontScale).toMatchObject({ $type: 'number', $value: 0.94 });
      expect(first.tokens.durationsMs.instant).toMatchObject({ $type: 'duration', $value: { value: 0, unit: 'ms' } });
      expect(first.tokens.surfaceClassName).toBeUndefined();
      const metadata = first.$extensions['app.navet.design'];
      expect(metadata.tokenCount).toBe(4);
      expect(metadata.omitted.map((item) => item.path)).toEqual(expect.arrayContaining([
        'tokens.surfaceClassName', 'tokens.reduceMotion', 'tokens.focus',
      ]));
      expect(first.tokens.controlHeightPx.$extensions['app.navet.design'].source).toBe('tokens.ts');
      const selected = findDesignTokens(first, 'CONTROLHEIGHT');
      expect(selected).toEqual({
        sourceFingerprint: metadata.sourceFingerprint,
        tokens: [{ path: 'tokens.controlHeightPx', ...first.tokens.controlHeightPx }],
        omitted: [],
      });
      expect(findDesignTokens(first, 'surfaceClassName').omitted).toEqual([
        expect.objectContaining({ path: 'tokens.surfaceClassName', source: 'tokens.ts' }),
      ]);
      expect(findDesignTokens(first, 'unknown')).toEqual({ sourceFingerprint: metadata.sourceFingerprint, tokens: [], omitted: [] });
      const link = `${root}-link`;
      try {
        symlinkSync(root, link, 'dir');
        expect(generateDesignTokens({ ...input, root: link })).toEqual(first);
      } finally { rmSync(link, { force: true }); }
      writeFileSync(path.join(root, 'base.ts'), 'export const compact = 40 as const;');
      const second = generateDesignTokens(input);
      expect(second.tokens.controlHeightPx.$value.value).toBe(40);
      expect(second.$extensions['app.navet.design'].sourceFingerprint).not.toBe(metadata.sourceFingerprint);
    } finally { cleanup(); }
  });

  it('rejects unresolved/widened units rather than inventing a numeric token', () => {
    const { root, input, cleanup } = fixture();
    try {
      writeFileSync(path.join(root, 'tokens.ts'), 'export const tokens = { heightPx: 40 };');
      expect(() => generateDesignTokens(input)).toThrow('finite numeric constant');
      writeFileSync(path.join(root, 'tokens.ts'), 'export const tokens = { heightPx: missing.value } as const;');
      expect(() => generateDesignTokens(input)).toThrow('finite numeric constant');
    } finally { cleanup(); }
  });

  it('rejects absent exports and unsupported DTCG names', () => {
    const { root, input, cleanup } = fixture();
    try {
      writeFileSync(path.join(root, 'tokens.ts'), 'export const tokens = { "size.badPx": 40 } as const;');
      expect(() => generateDesignTokens(input)).toThrow('Unsupported token name');
      writeFileSync(path.join(root, 'index.ts'), "export * from './missing';");
      expect(() => generateDesignTokens(input)).toThrow('No representable tokens');
    } finally { cleanup(); }
  });
});
