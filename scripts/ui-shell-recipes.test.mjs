import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyCompositionBaseline, findCompositionViolations, findLegacyModalRecipes } from './ui-shell-recipes.mjs';

function hasLegacyModalRecipe(source) {
  const root = mkdtempSync(path.join(tmpdir(), 'navet-ui-shell-test-'));
  try {
    writeFileSync(path.join(root, 'example.tsx'), source);
    return findLegacyModalRecipes(root, ['example.tsx']).has('example.tsx');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('known legacy shell recipes', () => {
  it('accepts an empty file selection', () => {
    expect(findLegacyModalRecipes(process.cwd(), []).size).toBe(0);
  });
  it.each([
    String.raw`<div className={'fixed\nleft-1/2 top-1/2 z-50 shadow-2xl backdrop-blur-xl'} />`,
    '<div className="fixed left-1/2 top-1/2 z-50 shadow-2xl backdrop-blur-xl" />',
    '<div className="shadow-2xl backdrop-blur-xl top-1/2 z-50 left-1/2 fixed" />',
    '<div className={`shadow-2xl fixed\n  backdrop-blur-xl z-50 top-1/2 left-1/2 ${surface}`} />',
    '<div className="fixed inset-x-0 bottom-0 z-50 rounded-[30px] shadow-2xl" />',
    '<div className="rounded-[30px] shadow-2xl z-50 bottom-0 fixed inset-x-0" />',
    'const classes = "fixed left-1/2 top-1/2 z-50 shadow-2xl backdrop-blur-xl"; <div className={classes} />',
    '<div className={cn("fixed left-1/2 top-1/2 z-50 shadow-2xl backdrop-blur-xl")} />',
    'import { clsx as join } from "clsx"; const classes = join("fixed left-1/2 top-1/2 z-50 shadow-2xl backdrop-blur-xl"); <div className={classes} />',
    'const props = { className: "fixed left-1/2 top-1/2 z-50 shadow-2xl backdrop-blur-xl" }; <div {...props} />',
  ])('rejects a copied complete shell: %s', (source) => {
    expect(hasLegacyModalRecipe(source)).toBe(true);
  });

  it('ignores apostrophes in comments preceding a copied shell', () => {
    expect(hasLegacyModalRecipe("// don't copy shells\n" + '<div className="shadow-2xl fixed backdrop-blur-xl z-50 top-1/2 left-1/2" />')).toBe(true);
  });

  it.each([
    '<div className="fixed bottom-0 inset-x-0" />',
    '<div className="left-1/2 top-1/2 z-50 shadow-2xl backdrop-blur-xl" />',
    '<div className="fixed top-1/2 left-1/2 z-50 shadow-2xl" />',
    '<div className="md:fixed left-1/2 top-1/2 z-50 shadow-2xl backdrop-blur-xl" />',
    '<div className="fixed left-1/2" /><div className="top-1/2 z-50 shadow-2xl backdrop-blur-xl" />',
    '<SheetSurface contentClassName="shadow-2xl" />',
    'const fixture = "fixed left-1/2 top-1/2 z-50 shadow-2xl backdrop-blur-xl";',
    'throw new Error("fixed left-1/2 top-1/2 z-50 shadow-2xl backdrop-blur-xl");',
    '<p>fixed left-1/2 top-1/2 z-50 shadow-2xl backdrop-blur-xl</p>',
    '<div aria-label="fixed left-1/2 top-1/2 z-50 shadow-2xl backdrop-blur-xl" />',
    'expect("fixed left-1/2 top-1/2 z-50 shadow-2xl backdrop-blur-xl").toBe("example");',
    '// \"fixed left-1/2 top-1/2 z-50 shadow-2xl backdrop-blur-xl\"',
    '/* \"fixed left-1/2 top-1/2 z-50 shadow-2xl backdrop-blur-xl\" */',
    '<div className="fixed inset-x-0 bottom-0 z-50 rounded-[30px] shadow-2xl-extra" />',
  ])('accepts layout or an incomplete signature: %s', (source) => {
    expect(hasLegacyModalRecipe(source)).toBe(false);
  });
});

// Keep the legacy signature cases; add structural and occurrence-baseline coverage.
function inspect(source, file = 'example.tsx') {
  const root = mkdtempSync(path.join(tmpdir(), 'navet-composition-test-'));
  try {
    const absolute = path.join(root, file);
    mkdirSync(path.dirname(absolute), { recursive: true }); writeFileSync(absolute, source);
    return findCompositionViolations(root, [file]);
  } finally { rmSync(root, { recursive: true, force: true }); }
}
const imports = "import { SheetSurface as Sheet, SheetSurfaceHeader as Header } from '@navet/app/ui-kit/primitives';";
it('accepts a direct-child sheet header, including aliases and comments', () => {
  expect(inspect(imports + '/* <div><Header /></div> */ <Sheet><Header /></Sheet>')).toEqual([]);
  expect(inspect("import * as UI from '@navet/app/ui-kit/primitives'; <UI.SheetSurface><UI.SheetSurfaceHeader /></UI.SheetSurface>")).toEqual([]);
});
it.each([
  '<Sheet><div><Header /></div></Sheet>',
  '<Sheet><><Header /></></Sheet>',
  'const Alias = Header; <Sheet><div><Alias /></div></Sheet>',
])('detects a nested sheet header: %s', (source) => { expect(inspect(imports + source).map((entry) => entry.rule)).toEqual(['nested-sheet-header']); });
it('does not confuse unrelated local names with canonical headers', () => {
  expect(inspect('const SheetSurfaceHeader = () => null; <div><SheetSurfaceHeader /></div>')).toEqual([]);
});
it('requires explicit close autofocus in shell templates', () => {
  const file = 'packages/app/src/composition-recipes/example.tsx';
  expect(inspect(imports + '<Sheet><Header /></Sheet>', file).map((entry) => entry.rule)).toEqual(['missing-focus-return']);
  expect(inspect(imports + '<Sheet onCloseAutoFocus={(event) => { event.preventDefault(); launcher.focus(); }}><Header /></Sheet>', file)).toEqual([]);
});
it('baselines one occurrence and rejects new violations in the same file and obsolete entries', () => {
  const original = inspect(imports + '<Sheet><div><Header /></div></Sheet>');
  const baseline = original.map(({ line, ...entry }) => ({ ...entry, reason: 'Existing feature outside this change' }));
  expect(applyCompositionBaseline(original, baseline)).toEqual({ newViolations: [], obsolete: [] });
  const expanded = inspect(imports + '<Sheet><div><Header /></div><div><Header /></div></Sheet>');
  expect(applyCompositionBaseline(expanded, baseline).newViolations).toHaveLength(1);
  expect(applyCompositionBaseline([], baseline).obsolete).toHaveLength(1);
  expect(() => applyCompositionBaseline(original, [...baseline, ...baseline])).toThrow('duplicate');
});
it('detects multiple consumers of an aliased duplicated shell', () => {
  const violations = inspect('const shell = "fixed left-1/2 top-1/2 z-50 shadow-2xl backdrop-blur-xl"; <div className={shell} /><section className={shell} />');
  expect(violations.filter((entry) => entry.rule === 'duplicate-shell')).toHaveLength(2);
});
it('combines static builder arguments without merging mutually exclusive branches', () => {
  expect(inspect('<div className={cn("fixed left-1/2 top-1/2", "z-50 shadow-2xl backdrop-blur-xl")} />').map((entry) => entry.rule)).toContain('duplicate-shell');
  expect(inspect('import { clsx as join } from "clsx"; <div className={join("fixed left-1/2 top-1/2", "z-50 shadow-2xl", "backdrop-blur-xl")} />').map((entry) => entry.rule)).toContain('duplicate-shell');
  expect(inspect('<div className={cn(flag ? "fixed left-1/2 top-1/2" : "z-50 shadow-2xl backdrop-blur-xl")} />')).toEqual([]);
});
