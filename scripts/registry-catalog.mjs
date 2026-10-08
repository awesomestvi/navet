import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { safeSourcePath } from './registry-source.mjs';
const fingerprint = (value) => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const slug = (value) => value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const indexedSource = (entry) => path.posix.normalize(entry.importPath.startsWith('../../') ? path.posix.join('apps/storybook', entry.importPath) : entry.importPath);
export function resolveCatalogReference(index, reference) {
  const entry = index.entries?.[reference.id];
  if (!entry || indexedSource(entry) !== reference.source || entry.type !== (reference.type ?? 'story') || entry.type === 'story' && entry.exportName !== reference.export) throw new Error(`Catalog reference mismatch: ${reference.id}`);
  return entry;
}
export function buildCatalogItems(root, catalog, index, provenance) {
  if (!catalog.storyFiles) return [];
  const stories = Object.values(index.entries ?? {}).filter((entry) => ['story', 'docs'].includes(entry.type));
  const links = (source) => stories.filter((entry) => indexedSource(entry) === source).map((entry) => ({
    source, export: entry.exportName ?? null, type: entry.type, id: entry.id, name: entry.name ?? 'Docs', title: entry.title, tags: entry.tags ?? [], href: `?path=/${entry.type}/${entry.id}`,
  }));
  const level = (source) => source.includes('/system/') || source.includes('/ui-kit/tokens') ? 'foundation'
    : source.includes('/primitives/') ? 'primitive' : source.includes('/patterns/') ? 'pattern'
      : source.includes('/features/') ? 'feature' : source.includes('/marketing/') ? 'marketing' : 'reference';
  function item(name, title, source, contracts, examples, kind) {
    const content = readFileSync(safeSourcePath(root, source), 'utf8');
    const barrelLevel = { tokens: 'foundation', primitives: 'primitive', patterns: 'pattern' }[contracts[0]?.importFrom?.match(/\/ui-kit\/(tokens|primitives|patterns)$/)?.[1]];
    const family = kind === 'contract' && barrelLevel ? barrelLevel : examples[0]?.title?.startsWith('Theme/') ? 'foundation' : level(source);
    const sourceFiles = [...new Set([source, ...contracts.map((entry) => entry.source)])].map((file) => ({ source: file, fingerprint: fingerprint(readFileSync(safeSourcePath(root, file), 'utf8')) }));
    const meta = {
      ...provenance, scope: 'navet-app', catalogKind: kind, level: family,
      reviewStatus: 'unclassified', owner: path.posix.dirname(source), acceptance: null,
      source, sourceFiles, sourceFingerprint: catalog.sourceFingerprint,
      templateFingerprint: fingerprint(content), contractFingerprint: fingerprint(contracts),
      storyFingerprint: fingerprint(examples.map((story) => ({ ...story, content: readFileSync(safeSourcePath(root, story.source), 'utf8') }))),
      contracts, examples, states: examples.filter((story) => story.type === 'story').map((story) => story.name),
      story: examples[0] ?? null, reference: examples[0] ?? null,
      installation: 'reference-only', dependencies: contracts.flatMap((entry) => entry.dependencies ?? []),
      context: ['Navet app runtime and Storybook decorators; inspect source imports and reference examples.'],
    };
    meta.compositionFingerprint = fingerprint(meta);
    return {
      $schema: 'https://ui.shadcn.com/schema/registry-item.json', name, type: 'registry:item', title,
      description: `${title}. Navet ${family} ${kind}. Source: ${source}. Review: unclassified. Reuse canonical imports; inspect source and executable Storybook references before composing UI. ${examples.map((story) => `${story.title} ${story.name}`).join(' ')}`,
      categories: ['navet', 'source-catalog', family, kind, 'unclassified'],
      dependencies: [], registryDependencies: [],
      // MCP source inspection receives the actual implementation. Installation writes
      // an inert ignored reference snapshot, never a competing component implementation.
      files: [{ path: source, type: 'registry:file', target: `.cache/agent-design/references/${name}.txt`, content }],
      docs: `Reuse this canonical Navet source inside the app. This item installs only a text reference snapshot.\n\nOwner: ${meta.owner}. Review: unclassified; catalog presence does not establish design acceptance.\n\nImports and contracts:\n${contracts.map((entry) => `${entry.exportName ?? entry.name} from ${entry.importFrom} (${entry.source}:${entry.line})`).join('\n')}\n\nExecutable examples:\n${examples.map((story) => `- ${story.title}: ${story.name} ${story.href}`).join('\n')}\n\nFor a card: name the closest same-family reference, reuse BaseCard and existing slots, patterns and tokens; preserve supported sizes, states and themes. A new visual pattern needs maintainer approval.`,
      meta,
    };
  }
  const items = catalog.entries.flatMap((entry) => [entry, ...(entry.members ?? [])]).map((entry) => {
    const key = `${entry.importFrom}#${entry.name}`;
    const name = `source-${slug(entry.name === 'default' ? path.posix.basename(entry.source).replace(/\.tsx?$/, '') : entry.name)}-${fingerprint(key).slice(0, 12)}`;
    const examples = entry.stories.flatMap((story) => links(story.source)).sort((a, b) => Number(b.type === 'story') - Number(a.type === 'story') || Number(slug(b.title ?? '').includes(slug(entry.name))) - Number(slug(a.title ?? '').includes(slug(entry.name))));
    return item(name, entry.name === 'default' ? path.posix.basename(entry.source) : entry.name, entry.source, [entry], [...new Map(examples.map((story) => [story.id, story])).values()], 'contract');
  });
  // Use the executable index for exhaustive coverage, including story-local demos,
  // diagnostics and stories without an imported component or explicit static title.
  for (const source of [...new Set(stories.map(indexedSource))].sort()) {
    const examples = links(source).sort((a, b) => Number(b.type === 'story') - Number(a.type === 'story'));
    const name = `example-${slug(path.posix.basename(source).replace(/\.stories\.tsx?$/, ''))}-${fingerprint(source).slice(0, 12)}`;
    const declared = catalog.storyFiles?.find((story) => story.source === source)?.contracts ?? [];
    const contracts = declared.flatMap((ref) => catalog.entries.filter((entry) => entry.name === ref.name && entry.importFrom === ref.importFrom));
    items.push(item(name, examples[0].title ?? source, source, contracts, examples, 'example'));
  }
  return items;
}
