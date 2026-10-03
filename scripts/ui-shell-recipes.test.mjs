import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { findLegacyModalRecipes } from './ui-shell-recipes.mjs';

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
    '// \"fixed left-1/2 top-1/2 z-50 shadow-2xl backdrop-blur-xl\"',
    '/* \"fixed left-1/2 top-1/2 z-50 shadow-2xl backdrop-blur-xl\" */',
    '<div className="fixed inset-x-0 bottom-0 z-50 rounded-[30px] shadow-2xl-extra" />',
  ])('accepts layout or an incomplete signature: %s', (source) => {
    expect(hasLegacyModalRecipe(source)).toBe(false);
  });
});
