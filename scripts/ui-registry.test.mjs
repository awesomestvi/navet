import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { buildRegistry, resolveStory, serveRegistry, writeRegistry } from './ui-registry.mjs';
import { validateRegistry } from './registry-schema.mjs';
const roots = [];
afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));
function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'navet-registry-')); roots.push(root);
  const directory = path.join(root, 'packages/app/src/ui-kit/registry'); mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ dependencies: { react: '19.2.0' } }));
  writeFileSync(path.join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: { moduleResolution: 'bundler', module: 'esnext', paths: { '@navet/app/*': ['./packages/app/src/*'] } } }));
  writeFileSync(path.join(root, 'packages/app/src/ui-kit/primitives.ts'), 'export const Button = () => null; export const Input = () => null;');
  writeFileSync(path.join(directory, 'example.tsx'), "import { Button } from '@navet/app/ui-kit/primitives'; export const Example = Button;");
  writeFileSync(path.join(directory, 'registry.stories.tsx'), 'export const Example = {};');
  writeFileSync(path.join(directory, 'reference.stories.tsx'), 'export const Default = {};');
  const recipe = { name: 'example', title: 'Example', description: 'A compact action', when: 'One action', family: 'action', searchTerms: ['keyboard action'], states: ['enabled', 'disabled'], context: ['Theme context'], components: ['Button'], review: ['Keyboard action'], templateExport: 'Example', storyExport: 'Example', reference: 'packages/app/src/ui-kit/registry/reference.stories.tsx', referenceExport: 'Default' };
  const manifest = path.join(directory, 'recipes.json'); writeFileSync(manifest, JSON.stringify([recipe]));
  const catalog = { sourceFingerprint: 'current-source', entries: [{ name: 'Button', kind: 'value', importFrom: '@navet/app/ui-kit/primitives', source: 'button.tsx', line: 12, parameters: 'ButtonProps', properties: [{ name: 'disabled', type: 'boolean', optional: true }], variants: [] }] };
  const index = { v: 5, entries: { recipe: { id: 'actual-custom-recipe-id', type: 'story', importPath: './packages/app/src/ui-kit/registry/registry.stories.tsx', exportName: 'Example' }, reference: { id: 'actual-custom-reference-id', type: 'story', importPath: `./${recipe.reference}`, exportName: 'Default' } } };
  const options = { index, revision: { commit: 'a'.repeat(40), dirty: false } };
  const build = () => buildRegistry(root, catalog, options);
  return { root, directory, recipe, manifest, catalog, index, options, build };
}
it('distributes exact templates, current contracts, resolved Storybook IDs and no dependencies/themes', () => {
  const { root, directory, catalog, options, build } = fixture(); const item = build().items[0];
  expect(item.files).toEqual([{ path: 'packages/app/src/ui-kit/registry/example.tsx', target: '@components/recipes/example.tsx', type: 'registry:file', content: readFileSync(path.join(directory, 'example.tsx'), 'utf8') }]);
  expect(item.meta.contracts[0]).toMatchObject({ name: 'Button', line: 12 });
  expect(item.meta.sourceFingerprint).toBe('current-source');
  expect(item.meta.story.id).toBe('actual-custom-recipe-id');
  expect(item.meta.reference.id).toBe('actual-custom-reference-id');
  expect(item.dependencies).toEqual([]); expect(item.registryDependencies).toEqual([]);
  const next = buildRegistry(root, { ...catalog, sourceFingerprint: 'new-source', entries: [{ ...catalog.entries[0], line: 25 }] }, options);
  expect(next.items[0].meta.contracts[0].line).toBe(25);
  expect(next.items[0].meta.contractFingerprint).not.toBe(item.meta.contractFingerprint);
});
it('rejects renamed component, template, recipe and reference exports', () => {
  const f = fixture();
  expect(() => buildRegistry(f.root, { ...f.catalog, entries: [] }, f.options)).toThrow('not a current UI-kit export');
  writeFileSync(path.join(f.directory, 'example.tsx'), "import { Button } from '@navet/app/ui-kit/primitives'; export const Renamed = Button;");
  expect(f.build).toThrow('missing template export');
  writeFileSync(path.join(f.directory, 'example.tsx'), "import { Button } from '@navet/app/ui-kit/primitives'; export const Example = Button;");
  writeFileSync(path.join(f.directory, 'registry.stories.tsx'), '/* export const Example = {}; */ export const Renamed = {};');
  expect(f.build).toThrow('missing recipe story export');
  writeFileSync(path.join(f.directory, 'registry.stories.tsx'), 'export const Example = {};');
  writeFileSync(path.join(f.directory, 'reference.stories.tsx'), 'export const Renamed = {};');
  expect(f.build).toThrow('missing reference story export');
});
it.each([
  ["import { callService } from '@navet/provider-homeassistant'; export const Example = callService;", 'unexpected template import'],
  ["import { Input } from '@navet/app/ui-kit/primitives'; export const Example = Input;", 'undeclared component import'],
  ["import { Button as Action, Input as Field } from '@navet/app/ui-kit/primitives'; export const Example = Action;", 'undeclared component import'],
  ["import '@navet/app/ui-kit/primitives'; export const Example = () => null;", 'side effect import'],
  ["import { Button } from '@navet/app/ui-kit/primitives'; export const Example = () => import('@navet/provider-homeassistant');", 'runtime imports'],
  ["import { Button } from '@navet/app/ui-kit/primitives'; export const Example = () => require('@navet/provider-homeassistant');", 'runtime imports'],
])('rejects unsafe or undeclared imports: %s', (source, message) => {
  const f = fixture(); writeFileSync(path.join(f.directory, 'example.tsx'), source); expect(f.build).toThrow(message);
});
it.each([
  "// import { Input } from 'evil';\nimport { Button as Action } from '@navet/app/ui-kit/primitives'; export const Example = Action;",
  "import * as UI from '@navet/app/ui-kit/primitives'; export const Example = () => <UI.Button />;",
])('accepts aliases and ignores comments: %s', (source) => {
  const f = fixture(); writeFileSync(path.join(f.directory, 'example.tsx'), source); expect(f.build().items).toHaveLength(1);
});
it('rejects unresolvable imported symbols and unused declared components', () => {
  const f = fixture(); writeFileSync(path.join(f.root, 'packages/app/src/ui-kit/primitives.ts'), 'export const Renamed = () => null;');
  expect(f.build).toThrow('unresolved component');
  writeFileSync(path.join(f.root, 'packages/app/src/ui-kit/primitives.ts'), 'export const Button = () => null;');
  writeFileSync(path.join(f.directory, 'example.tsx'), 'export const Example = () => null;'); expect(f.build).toThrow('unused declared component');
});
it.each([null, {}, [], [{ name: '../escape' }]])('rejects invalid manifest shape: %j', (manifest) => {
  const f = fixture(); writeFileSync(f.manifest, JSON.stringify(manifest)); expect(f.build).toThrow();
});
it.each(['family', 'searchTerms', 'states', 'templateExport', 'referenceExport'])('requires %s metadata', (key) => {
  const f = fixture(); delete f.recipe[key]; writeFileSync(f.manifest, JSON.stringify([f.recipe])); expect(f.build).toThrow(key);
});
it('rejects duplicate names and unmanifested templates; atomically removes stale payloads', () => {
  const f = fixture(); writeFileSync(f.manifest, JSON.stringify([f.recipe, f.recipe])); expect(f.build).toThrow('duplicate recipe name');
  writeFileSync(f.manifest, JSON.stringify([f.recipe])); const registry = f.build(); const output = writeRegistry(f.root, registry);
  writeFileSync(path.join(output, 'obsolete.json'), '{}'); writeRegistry(f.root, registry); expect(() => readFileSync(path.join(output, 'obsolete.json'))).toThrow();
  writeFileSync(path.join(f.directory, 'unlisted.tsx'), 'export const Unlisted = {};'); expect(f.build).toThrow('Unmanifested template');
});
it.each(['../escape.stories.tsx', '/tmp/escape.stories.tsx', 'packages/../escape.stories.tsx', 'packages\\escape.stories.tsx'])('rejects unsafe reference paths: %s', (reference) => {
  const f = fixture(); f.recipe.reference = reference; writeFileSync(f.manifest, JSON.stringify([f.recipe])); expect(f.build).toThrow('Unsafe source path');
});
it('rejects symlinks escaping the checkout', () => {
  const f = fixture(); rmSync(path.join(f.directory, 'example.tsx')); symlinkSync('/etc/hosts', path.join(f.directory, 'example.tsx')); expect(f.build).toThrow('Unsafe source path');
});
it('requires the actual indexed export and rejects ambiguous index matches', () => {
  const f = fixture(); f.index.entries.recipe.exportName = 'Renamed'; expect(f.build).toThrow('indexed story');
  f.index.entries.recipe.exportName = 'Example'; f.index.entries.duplicate = { ...f.index.entries.recipe, id: 'duplicate' }; expect(f.build).toThrow('ambiguous indexed story');
  expect(() => resolveStory({ entries: {} }, 'missing', 'Default')).toThrow('indexed story');
});
it('resolves the build index relative to the Storybook workspace', () => {
  const f = fixture(); f.index.entries.recipe.importPath = '../../packages/app/src/ui-kit/registry/registry.stories.tsx';
  expect(f.build().items[0].meta.story.id).toBe('actual-custom-recipe-id');
});
it('validates payloads with official shadcn schemas and forbids theme/dependency mutation', () => {
  const f = fixture(); const registry = f.build(); expect(validateRegistry(registry)).toEqual(registry);
  const invalid = structuredClone(registry); invalid.items[0].files[0].type = 'registry:invalid'; expect(() => validateRegistry(invalid)).toThrow('schema');
  const unsafe = structuredClone(registry); unsafe.items[0].cssVars = {}; expect(() => validateRegistry(unsafe)).toThrow('modify themes');
});
it('produces deterministic fingerprints across checkouts and changes them with source, story and revision', () => {
  const a = fixture(), b = fixture(); expect(a.build()).toEqual(b.build()); const original = a.build().items[0].meta;
  writeFileSync(path.join(a.directory, 'example.tsx'), readFileSync(path.join(a.directory, 'example.tsx'), 'utf8') + '\n// edited composition\n');
  const changed = a.build().items[0].meta; expect(changed.templateFingerprint).not.toBe(original.templateFingerprint); expect(changed.compositionFingerprint).not.toBe(original.compositionFingerprint);
  writeFileSync(path.join(a.directory, 'reference.stories.tsx'), 'export const Default = { args: { disabled: true } };'); expect(a.build().items[0].meta.storyFingerprint).not.toBe(changed.storyFingerprint);
  a.options.revision.dirty = true; expect(a.build().items[0].meta.sourceRevision.dirty).toBe(true);
});
it('serves safe endpoints and refuses stale payloads after a failed rebuild', async () => {
  const f = fixture(); const registry = f.build(); const state = { error: null }; const server = serveRegistry(writeRegistry(f.root, registry), 0, state);
  try {
    await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
    const base = `http://127.0.0.1:${server.address().port}`;
    expect(await (await fetch(`${base}/r/registry.json`)).json()).toEqual(registry);
    expect(await (await fetch(`${base}/r/example.json`)).json()).toEqual(registry.items[0]);
    for (const url of ['/r/missing.json', '/package.json', '/r/%2e%2e%2fpackage.json']) expect((await fetch(base + url)).status).toBe(404);
    expect((await fetch(`${base}/r/example.json`, { method: 'HEAD' })).status).toBe(200);
    expect((await fetch(`${base}/r/example.json`, { method: 'POST' })).status).toBe(404);
    state.error = 'Build failed'; expect((await fetch(`${base}/r/example.json`)).status).toBe(503);
    state.error = null; expect((await fetch(`${base}/r/example.json`)).status).toBe(200);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
