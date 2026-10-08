#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildRegistry, fingerprint, resolveStory } from './ui-registry.mjs';
import { resolveCatalogReference } from './registry-catalog.mjs';
import { indexItem } from './registry-index.mjs';
import { validateRegistry } from './registry-schema.mjs';
export async function inspectPreview(base, revision, request = fetch) {
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Provide an explicit Storybook base URL without credentials, query or fragment');
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('Expected revision must be an exact commit SHA');
  const endpoint = (file) => new URL(file, `${url.href.replace(/\/$/, '')}/`).href;
  const get = async (file) => {
    let response = await request(endpoint(file), { redirect: file === 'iframe.html' ? 'manual' : 'error', cache: 'no-store', signal: AbortSignal.timeout(20000) });
    if (file === 'iframe.html' && response.status === 308) {
      const location = response.headers.get('location');
      if (!location || new URL(location, endpoint(file)).href !== endpoint('iframe')) throw new Error('iframe.html: unsafe redirect; no alternate revision is used');
      response = await request(endpoint('iframe'), { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(20000) });
    }
    if (!response.ok) throw new Error(`${file}: HTTP ${response.status}; no alternate revision is used`);
    return response;
  };
  const [registry, index, iframe] = await Promise.all([get('r/registry.json').then((r) => r.json()), get('index.json').then((r) => r.json()), get('iframe.html').then((r) => r.text())]);
  validateRegistry(registry);
  const renderedFingerprint = fingerprint([index, iframe]);
  for (let position = 0; position < registry.items.length; position++) {
    const summary = registry.items[position];
    const item = await (await get(`r/${summary.name}.json`)).json();
    if (JSON.stringify(indexItem(item)) !== JSON.stringify(summary)) throw new Error(`${summary.name}: item/index payload mismatch`);
    registry.items[position] = item;
    if (item.meta.sourceRevision.commit !== revision || item.meta.sourceRevision.dirty) throw new Error(`${item.name}: preview revision mismatch or dirty source`);
    if (item.meta.renderedFingerprint !== renderedFingerprint) throw new Error(`${item.name}: rendered Storybook fingerprint mismatch`);
    for (const story of [item.meta.story, item.meta.reference, ...(item.meta.examples ?? [])].filter(Boolean)) if ((item.meta.catalogKind ? resolveCatalogReference(index, story).id : resolveStory(index, story.source, story.export).id) !== story.id) throw new Error(`${item.name}: story link mismatch`);
    if (fingerprint(item.files[0].content) !== item.meta.templateFingerprint || fingerprint(item.meta.contracts) !== item.meta.contractFingerprint) throw new Error(`${item.name}: payload fingerprint mismatch`);

  }
  validateRegistry(registry);
  return { registry, index, renderedFingerprint, base: url.href.replace(/\/$/, '') };
}
export function matchLocalSource(preview, local) {
  if (preview.registry.items.length !== local.items.length) throw new Error('Preview manifest coverage differs from current source');
  for (const item of local.items) {
    const remote = preview.registry.items.find((value) => value.name === item.name);
    for (const key of ['sourceFingerprint', 'templateFingerprint', 'contractFingerprint', 'storyFingerprint', 'compositionFingerprint']) if (!remote || remote.meta[key] !== item.meta[key]) throw new Error(`${item.name}: hosted ${key} differs from current source`);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [base, revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()] = process.argv.slice(2);
  if (!base) throw new Error('Usage: pnpm registry:preview <exact-Storybook-preview-URL> [expected-SHA]');
  if (execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()) throw new Error('Commit current source before comparing hosted completion evidence');
  if (execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() !== revision) throw new Error('Expected SHA must match this checkout');
  const preview = await inspectPreview(base, revision);
  const local = buildRegistry(process.cwd(), undefined, { index: preview.index, revision: { commit: revision, dirty: false }, renderedFingerprint: preview.renderedFingerprint });
  matchLocalSource(preview, local);
  console.log(`Verified ${local.items.length} recipes against ${revision} at ${preview.base}`);
  console.log(`List: pnpm dlx shadcn@4.21.0 list ${preview.base}/r/registry.json`);
  console.log(`Search: pnpm dlx shadcn@4.21.0 search ${preview.base}/r/registry.json --query validation`);
  console.log(`View: pnpm dlx shadcn@4.21.0 view ${preview.base}/r/settings-dialog.json`);
  console.log(`Dry run: pnpm dlx shadcn@4.21.0 add ${preview.base}/r/settings-dialog.json --dry-run`);
}
