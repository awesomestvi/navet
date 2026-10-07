import { expect, it } from 'vitest';
import { inspectPreview, matchLocalSource } from './registry-preview.mjs';
import { fingerprint } from './ui-registry.mjs';
function fixture() {
  const revision = 'a'.repeat(40);
  const index = { entries: { example: { type: 'story', id: 'example', exportName: 'Example', importPath: './example.stories.tsx' } } };
  const iframe = '<script type="module" src="./assets/preview-current-content-hash.js"></script>';
  const reference = { source: 'example.stories.tsx', export: 'Example', id: 'example' };
  const item = { name: 'example', type: 'registry:block', files: [{ path: 'example.tsx', type: 'registry:file', target: '@components/recipes/example.tsx', content: 'export const Example = () => null;' }], meta: { sourceRevision: { commit: revision, dirty: false }, story: reference, reference, renderedFingerprint: fingerprint([index, iframe]), templateFingerprint: fingerprint('export const Example = () => null;'), contractFingerprint: fingerprint([]), contracts: [] } };
  const registry = { name: 'navet', homepage: 'https://github.com/navet-app/navet', items: [item] };
  const responses = new Map([['/r/registry.json', registry], ['/r/example.json', item], ['/index.json', index], ['/iframe.html', iframe]]);
  const calls = [];
  const request = async (url, options) => { calls.push({ url, options }); const payload = responses.get(new URL(url).pathname); return new Response(payload === undefined ? '' : typeof payload === 'string' ? payload : JSON.stringify(payload), { status: payload === undefined ? 404 : 200 }); };
  return { revision, registry, index, item, responses, calls, request };
}
it('verifies matching revision, rendered index/HTML, payloads and exact story exports', async () => {
  const f = fixture(); const preview = await inspectPreview('https://immutable-preview.pages.dev', f.revision, f.request);
  expect(preview.registry).toEqual(f.registry); expect(f.calls.every(({ options }) => options.redirect === 'error')).toBe(true);
  matchLocalSource(preview, f.registry);
});
it.each(['revision', 'dirty', 'rendered', 'story', 'payload'])('rejects mismatched %s evidence without fallback', async (problem) => {
  const f = fixture();
  if (problem === 'revision') f.item.meta.sourceRevision.commit = 'b'.repeat(40);
  if (problem === 'dirty') f.item.meta.sourceRevision.dirty = true;
  if (problem === 'rendered') f.responses.set('/iframe.html', 'different build');
  if (problem === 'story') f.item.meta.story = { ...f.item.meta.story, id: 'guessed-id' };
  if (problem === 'payload') f.responses.set('/r/example.json', { ...f.item, title: 'Changed item' });
  await expect(inspectPreview('https://exact-preview.pages.dev', f.revision, f.request)).rejects.toThrow();
  expect(f.calls.every(({ url }) => new URL(url).hostname === 'exact-preview.pages.dev')).toBe(true);
});
it('rejects missing endpoints and different source coverage/fingerprints', async () => {
  const f = fixture(); f.responses.delete('/r/example.json');
  await expect(inspectPreview('https://preview.pages.dev', f.revision, f.request)).rejects.toThrow('HTTP 404');
  expect(() => matchLocalSource({ registry: f.registry }, { items: [] })).toThrow('coverage');
  expect(() => matchLocalSource({ registry: f.registry }, { items: [{ ...f.item, meta: { ...f.item.meta, sourceFingerprint: 'different source' } }] })).toThrow('sourceFingerprint');
});
