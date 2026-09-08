import { describe, expect, it } from 'vitest';
import { checkPackageImports, readImportSpecifiers } from './package-import-policy.mjs';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
describe('package dependency direction', () => {
  it('the existing CLI discovers and rejects a new provider importing app internals', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'navet-import-policy-'));
    const script = path.resolve('scripts/check-provider-boundaries.mjs');
    try {
      for (const dir of [
        'packages/core/src', 'packages/ui/src',
        'packages/app/src/components/primitives', 'packages/app/src/components/patterns',
        'packages/app/src/components/shared', 'packages/app/src/components/system',
        'packages/app/src/ui-kit', 'packages/app/src/features/lighting/components/light-card',
        'apps/demo/src', 'apps/standalone/src',
      ]) mkdirSync(path.join(root, dir), { recursive: true });
      const src = path.join(root, 'packages/provider-example/src');
      mkdirSync(src, { recursive: true });
      writeFileSync(path.join(src, 'index.ts'), "export * from '../../app/src/stores';");
      const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('@navet/provider-example must not import @navet/app');
      writeFileSync(path.join(src, 'index.ts'), "export * from '@navet/core';");
      writeFileSync(path.join(src, 'example.test.ts'), "import '@navet/app';");
      writeFileSync(path.join(src, 'example.stories.tsx'), "import '@navet/app';");
      expect(execFileSync(process.execPath, [script], { cwd: root, encoding: 'utf8' }))
        .toContain('Provider boundary check passed.');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it.each([
    ['core', "import React from 'react';"],
    ['core', "export { jsx } from 'react/jsx-runtime';"],
    ['core', "import type { View } from '@navet/ui';"],
    ['core', "const provider = import('@navet/provider-homey');"],
    ['ui', "export * from '@navet/provider-openhab';"],
    ['provider-homey', "import { useStore } from '@navet/app/stores/integration-store';"],
    ['provider-homey', "const peer = require('@navet/provider-openhab');"],
    ['provider-openhab', "type View = import('@navet/ui').View;"],
    ['ui', "import '@navet/app';"],
    ['core', "import type { Connection } from 'home-assistant-js-websocket';"],
  ])('rejects forbidden dependency from %s: %s', (owner, source) => {
    expect(checkPackageImports(`packages/${owner}/src/example.ts`, source)).toHaveLength(1);
  });

  it('resolves relative imports across packages, including normalized parent segments', () => {
    expect(checkPackageImports('packages/core/src/nested/example.ts',
      "export * from '../../../ui/src/../src/index';")).toHaveLength(1);
    expect(checkPackageImports('packages/provider-homey/src/example.ts',
      "import { store } from '../../app/src/stores/integration-store';")).toHaveLength(1);
  });

  it.each([
    ['core', "export * from './types';"],
    ['ui', "import { useMemo } from 'react'; import type { NavetEntity } from '@navet/core';"],
    ['provider-homey', "import { ids } from '../../core/src/ids'; import { map } from './homey-mappers';"],
    ['provider-homeassistant', "import type { Connection } from 'home-assistant-js-websocket';"],
    ['app', "import { provider } from '@navet/provider-homey';"],
  ])('allows supported dependencies from %s', (owner, source) => {
    expect(checkPackageImports(`packages/${owner}/src/example.ts`, source)).toEqual([]);
  });

  it('ignores comments and quoted code examples', () => {
    const source = `// import X from '@navet/app';
      /* export * from '@navet/provider-homey'; */
      const example = "import('@navet/ui')";
      const quoted = 'require("react")';`;
    expect(readImportSpecifiers(source)).toEqual([]);
  });

  it('supports multiline reexports, literal dynamic imports and import-equals', () => {
    expect(readImportSpecifiers(`export type {\n X\n} from '@navet/core';
      const lazy = import(\`@navet/provider-homey\`);
      import provider = require('@navet/provider-openhab');`)).toEqual([
      '@navet/core', '@navet/provider-homey', '@navet/provider-openhab',
    ]);
  });

  it('continues past a color-validation regex to inspect subsequent imports', () => {
    expect(checkPackageImports('packages/core/src/example.ts',
      "const valid = /^#[0-9a-fA-F]{6}$/.test(color); import '@navet/app';"
    )).toHaveLength(1);
  });
});
