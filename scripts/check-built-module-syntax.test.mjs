import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkBuiltModuleSyntax } from './check-built-module-syntax.mjs';

describe('checkBuiltModuleSyntax', () => {
  it('accepts valid nested JavaScript modules', () => {
    const distDirectory = mkdtempSync(join(tmpdir(), 'navet-built-modules-valid-'));
    const assetsDirectory = join(distDirectory, 'assets');
    mkdirSync(assetsDirectory);
    writeFileSync(join(distDirectory, 'package.json'), '{"type":"module"}\n');
    writeFileSync(join(distDirectory, 'entry.js'), 'export const ready = true;\n');
    writeFileSync(join(assetsDirectory, 'dashboard.js'), 'export default function Dashboard() {}\n');

    expect(checkBuiltModuleSyntax(distDirectory)).toBe(2);
  });

  it('rejects an emitted export whose binding is undefined', () => {
    const distDirectory = mkdtempSync(join(tmpdir(), 'navet-built-modules-invalid-'));
    writeFileSync(join(distDirectory, 'package.json'), '{"type":"module"}\n');
    writeFileSync(join(distDirectory, 'page.js'), 'export { page_exports as default };\n');

    expect(() => checkBuiltModuleSyntax(distDirectory)).toThrow(
      "Export 'page_exports' is not defined in module"
    );
  });
});
