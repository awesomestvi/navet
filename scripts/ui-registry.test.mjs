import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { buildRegistry, serveRegistry, writeRegistry } from './ui-registry.mjs';

const roots = [];
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'navet-registry-'));
  roots.push(root);
  const directory = path.join(root, 'packages/app/src/ui-kit/registry');
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ dependencies: { react: '19.2.0' } }));
  writeFileSync(path.join(directory, 'example.tsx'), "import { Button } from '@navet/app/ui-kit/primitives'; export const Example = Button;");
  writeFileSync(path.join(directory, 'registry.stories.tsx'), 'export const Example = {};');
  writeFileSync(path.join(directory, 'reference.stories.tsx'), 'export const Default = {};');
  const recipe = { name: 'example', title: 'Example', description: 'A compact action', when: 'One action',
    context: ['Theme context'], components: ['Button'], review: ['Keyboard action'], storyExport: 'Example',
    reference: 'packages/app/src/ui-kit/registry/reference.stories.tsx' };
  const manifest = path.join(directory, 'recipes.json');
  writeFileSync(manifest, JSON.stringify([recipe]));
  const catalog = { sourceFingerprint: 'current-source', entries: [{ name: 'Button', kind: 'value',
    importFrom: '@navet/app/ui-kit/primitives', source: 'button.tsx', line: 12,
    parameters: 'ButtonProps', properties: [{ name: 'disabled', type: 'boolean', optional: true }], variants: [] }] };
  return { root, directory, recipe, manifest, catalog };
}

it('distributes the exact template with source-derived contracts and no shared implementation copies', () => {
  const { root, directory, catalog } = fixture();
  const registry = buildRegistry(root, catalog);
  const item = registry.items[0];
  expect(item.files).toEqual([{ path: 'packages/app/src/ui-kit/registry/example.tsx',
    target: '@components/recipes/example.tsx', type: 'registry:file', content: readFileSync(path.join(directory, 'example.tsx'), 'utf8') }]);
  expect(item.meta.contracts[0]).toMatchObject({ name: 'Button', importFrom: '@navet/app/ui-kit/primitives', line: 12 });
  expect(item.meta.sourceFingerprint).toBe('current-source');
  expect(item.meta.maturity).toBe('pilot');
  expect(item.dependencies).toEqual([]);
  expect(item.registryDependencies).toEqual([]);
  const next = buildRegistry(root, { ...catalog, sourceFingerprint: 'new-source', entries: [{ ...catalog.entries[0], line: 25 }] });
  expect(next.items[0].meta.contracts[0].line).toBe(25);
  expect(next.items[0].meta.sourceFingerprint).toBe('new-source');
});

it('rejects renamed exports, missing story exports and imports outside the curated UI contracts', () => {
  const { root, directory, catalog } = fixture();
  expect(() => buildRegistry(root, { ...catalog, entries: [] })).toThrow('not a current UI-kit export');
  writeFileSync(path.join(directory, 'registry.stories.tsx'), 'export const Renamed = {};');
  expect(() => buildRegistry(root, catalog)).toThrow('missing recipe story export');
  writeFileSync(path.join(directory, 'registry.stories.tsx'), 'export const Example = {};');
  writeFileSync(path.join(directory, 'example.tsx'), "import { callService } from '@navet/provider-homeassistant';");
  expect(() => buildRegistry(root, catalog)).toThrow('unexpected template import');
});

it('rejects duplicate names and removes obsolete payloads when rebuilding', () => {
  const { root, catalog, manifest, recipe } = fixture();
  writeFileSync(manifest, JSON.stringify([recipe, recipe]));
  expect(() => buildRegistry(root, catalog)).toThrow('duplicate recipe name');
  writeFileSync(manifest, JSON.stringify([recipe]));
  const registry = buildRegistry(root, catalog);
  const output = writeRegistry(root, registry);
  writeFileSync(path.join(output, 'obsolete.json'), '{}');
  writeRegistry(root, registry);
  expect(() => readFileSync(path.join(output, 'obsolete.json'))).toThrow();
  expect(JSON.parse(readFileSync(path.join(output, 'registry.json'), 'utf8')).items).toHaveLength(1);
});

it('serves a discoverable index and item payloads without exposing other workspace files', async () => {
  const { root, catalog } = fixture();
  const registry = buildRegistry(root, catalog);
  const server = serveRegistry(writeRegistry(root, registry), 0);
  try {
    await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
    const base = `http://127.0.0.1:${server.address().port}`;
    expect(await (await fetch(`${base}/r/registry.json`)).json()).toEqual(registry);
    expect(await (await fetch(`${base}/r/example.json`)).json()).toEqual(registry.items[0]);
    expect((await fetch(`${base}/r/missing.json`)).status).toBe(404);
    expect((await fetch(`${base}/package.json`)).status).toBe(404);
    expect((await fetch(`${base}/r/example.json`, { method: 'HEAD' })).status).toBe(200);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
