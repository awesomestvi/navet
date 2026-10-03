import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveCssDesignTokens } from './agent-design-token-css.mjs';
import { findDesignTokens, generateDesignTokens } from './agent-design-tokens.mjs';

const EXTENSION = 'app.navet.design';
const roots = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function setup(values, css = '') {
  const root = mkdtempSync(path.join(tmpdir(), 'navet-css-token-'));
  roots.push(root);
  writeFileSync(path.join(root, 'index.ts'), `export const tokens = { minimumPx: 36, ${values} } as const;`);
  writeFileSync(path.join(root, 'styles.css'), '@import "tailwindcss/theme.css";\n@tailwind utilities;\n' + css);
  const document = generateDesignTokens({ root, file: 'index.ts' });
  const resolve = () => resolveCssDesignTokens({ root, document, cssEntry: 'styles.css' });
  return { root, document, resolve };
}

describe('faithful compiled dimension discovery', () => {
  it('resolves spacing, inset, explicit radius, control size and equal icon axes with their real units', async () => {
    const { document, resolve } = setup("gap: 'gap-1.5', inset: 'p-3', radius: 'rounded-[22px]', control: 'min-h-[42px]', icon: 'h-4 w-4'");
    const before = JSON.stringify(document);
    const result = await resolve();
    expect(result.tokens.gap.$value).toEqual({ value: 0.375, unit: 'rem' });
    expect(result.tokens.inset.$value).toEqual({ value: 0.75, unit: 'rem' });
    expect(result.tokens.radius.$value).toEqual({ value: 22, unit: 'px' });
    expect(result.tokens.control.$value).toEqual({ value: 42, unit: 'px' });
    expect(result.tokens.icon.$value).toEqual({ value: 1, unit: 'rem' });
    expect(result.tokens.icon.$extensions[EXTENSION].css).toEqual({ classes: ['h-4', 'w-4'], properties: ['height', 'width'] });
    expect(result.$extensions[EXTENSION]).toMatchObject({ tokenCount: 6, css: { resolvedTokens: 5 } });
    expect(JSON.stringify(document)).toBe(before);
    expect(findDesignTokens(result, 'icon')).toMatchObject({ styleFingerprint: result.$extensions[EXTENSION].css.sourceFingerprint, omitted: [] });
  });

  it('loads the package CSS entry used by the real application', async () => {
    const { root, resolve } = setup("gap: 'gap-4'");
    writeFileSync(path.join(root, 'styles.css'), '@import "tailwindcss" source(none);');
    expect((await resolve()).tokens.gap.$value).toEqual({ value: 1, unit: 'rem' });
  });

  it('reads customized theme spacing instead of assuming a four-pixel scale', async () => {
    const { root, document, resolve } = setup("gap: 'gap-4'", '@theme { --spacing: 8px; }');
    const first = await resolve();
    expect(first.tokens.gap.$value).toEqual({ value: 32, unit: 'px' });
    writeFileSync(path.join(root, 'styles.css'), '@import "tailwindcss/theme.css"; @tailwind utilities; @theme { --spacing: 0.5rem; }');
    const second = await resolve();
    expect(second.tokens.gap.$value).toEqual({ value: 2, unit: 'rem' });
    expect(second.$extensions[EXTENSION].sourceFingerprint).toBe(document.$extensions[EXTENSION].sourceFingerprint);
    expect(second.$extensions[EXTENSION].css.sourceFingerprint).not.toBe(first.$extensions[EXTENSION].css.sourceFingerprint);
  });

  it.each([
    "recipe: 'px-4 py-2'", "recipe: 'h-4 w-5'", "recipe: 'text-sm leading-6'",
    "recipe: 'space-y-2'", "recipe: 'rounded-full'", "recipe: 'md:gap-4'",
    "recipe: 'min-h-[var(--size)]'", "recipe: 'rounded-[2em]'",
  ])('preserves an unrepresentable recipe %s as an omission', async (values) => {
    const { resolve } = setup(values);
    const result = await resolve();
    expect(result.tokens.recipe).toBeUndefined();
    expect(result.$extensions[EXTENSION].omitted).toEqual(expect.arrayContaining([expect.objectContaining({ path: 'tokens.recipe', source: 'index.ts' })]));
    expect(result.$extensions[EXTENSION].css.resolvedTokens).toBe(0);
  });

  it('retains nested group/leaf provenance while removing a misleading all-omitted group record', async () => {
    const { resolve } = setup("sizes: { small: 'h-9 w-9', large: 'h-[42px] w-[42px]' }");
    const result = await resolve();
    expect(result.tokens.sizes.small.$value).toEqual({ value: 2.25, unit: 'rem' });
    expect(result.tokens.sizes.large.$value).toEqual({ value: 42, unit: 'px' });
    expect(result.tokens.sizes.small.$extensions[EXTENSION]).toMatchObject({ source: 'index.ts', line: 1, sourcePath: 'tokens.sizes.small' });
    expect(result.$extensions[EXTENSION].omitted.some((item) => item.path === 'tokens.sizes')).toBe(false);
  });

  it('rejects dynamic or conditional spacing overrides instead of choosing one mode', async () => {
    const { resolve } = setup("gap: 'gap-4'", '.dense { --spacing: 0.5rem; }');
    const result = await resolve();
    expect(result.tokens.gap).toBeUndefined();
    expect(result.$extensions[EXTENSION].css.resolvedTokens).toBe(0);
  });

  it('omits conflicting utility rules instead of ignoring cascade overrides', async () => {
    const { resolve } = setup("gap: 'gap-4'", '.gap-4 { gap: 12px; }');
    const result = await resolve();
    expect(result.tokens.gap).toBeUndefined();
  });

  it('omits a scoped custom utility that has no unconditional compiled rule', async () => {
    const { root, resolve } = setup("gap: 'gap-4'");
    writeFileSync(path.join(root, 'styles.css'), '@scope (.compact) { .gap-4 { gap: 12px; } }');
    expect((await resolve()).tokens.gap).toBeUndefined();
  });

  it('omits a custom utility nested beneath a conditional selector', async () => {
    const { root, resolve } = setup("gap: 'gap-4'");
    writeFileSync(path.join(root, 'styles.css'), '.compact { .gap-4 { gap: 12px; } }');
    expect((await resolve()).tokens.gap).toBeUndefined();
  });

  it('fingerprints imported source changes and keeps existing numeric evidence intact', async () => {
    const { root, resolve, document } = setup("radius: 'rounded-[22px]'", '@import "./extra.css";');
    writeFileSync(path.join(root, 'extra.css'), ':root { --independent-value: 1px; }');
    const first = await resolve();
    writeFileSync(path.join(root, 'extra.css'), ':root { --independent-value: 2px; }');
    const second = await resolve();
    expect(second.tokens.minimumPx).toEqual(document.tokens.minimumPx);
    expect(second.$extensions[EXTENSION].css.sourceFingerprint).not.toBe(first.$extensions[EXTENSION].css.sourceFingerprint);
    expect(second.$extensions[EXTENSION].css.sources).toContain('extra.css');
  });

  it('rejects outside-checkout imports without reading or exporting their contents', async () => {
    const other = mkdtempSync(path.join(tmpdir(), 'navet-css-external-'));
    roots.push(other);
    writeFileSync(path.join(other, 'external.css'), ':root { --private-value: 7px; }');
    const { resolve } = setup("gap: 'gap-4'", `@import "${path.join(other, 'external.css')}";`);
    await expect(resolve()).rejects.toThrow('Stylesheet must belong');
  });

  it('cannot execute stylesheet JavaScript plugins', async () => {
    const { resolve } = setup("gap: 'gap-4'", '@plugin "./plugin.js";');
    await expect(resolve()).rejects.toThrow();
  });
});
