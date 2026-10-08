import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { generateCatalog } from './agent-component-catalog.mjs';
import { buildCatalogItems } from './registry-catalog.mjs';
import { validateRegistry } from './registry-schema.mjs';
it('exposes real foundations, imported feature contracts and every indexed state without installing duplicate components', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'navet-source-registry-'));
  try {
    writeFileSync(path.join(root, 'tokens.ts'), 'export const spacing = { compact: 4 };');
    writeFileSync(path.join(root, 'card.stories.tsx'), "import { spacing } from './tokens'; export default { title: 'Cards/Test' }; export const Small = { args: { gap: spacing.compact } }; export const Unavailable = {}; ");
    writeFileSync(path.join(root, 'local.stories.tsx'), "export default { title: 'Diagnostics/Local' }; export const LongLabel = {}; ");
    const input = { root, entries: [{ file: 'tokens.ts', importFrom: '@navet/app/ui-kit/tokens' }], stories: ['card.stories.tsx', 'local.stories.tsx'] };
    const catalog = generateCatalog(input);
    const index = { entries: Object.fromEntries([['small', 'card.stories.tsx', 'Small'], ['unavailable', 'card.stories.tsx', 'Unavailable'], ['long', 'local.stories.tsx', 'LongLabel']].map(([id, source, exportName]) => [id, { id, importPath: `./${source}`, exportName, name: exportName, title: 'Cards/Test', type: exportName === 'LongLabel' ? 'docs' : 'story' }])) };
    const provenance = { sourceRevision: { commit: 'a'.repeat(40), dirty: false }, renderedFingerprint: null };
    const items = buildCatalogItems(root, catalog, index, provenance);
    expect(items.find((item) => item.title === 'spacing').meta.contracts[0].type).toContain('compact');
    expect(items.find((item) => item.title === 'spacing').meta.level).toBe('foundation');
    expect(items.filter((item) => item.meta.catalogKind === 'example').flatMap((item) => item.meta.examples.map((story) => story.id))).toEqual(['small', 'unavailable', 'long']);
    expect(items.find((item) => item.meta.source === 'local.stories.tsx').meta.reference.href).toBe('?path=/docs/long');
    for (const item of items) {
      expect(item.meta.reviewStatus).toBe('unclassified');
      expect(item.files[0].content).toBe(read(item.meta.source));
      expect(item.files[0].target).toMatch(/^\.cache\/agent-design\/references\/.*\.txt$/);
      expect(item.dependencies).toEqual([]);
    }
    validateRegistry({ name: 'navet', homepage: 'https://navet.app', items });
    const first = items.find((item) => item.title === 'spacing');
    writeFileSync(path.join(root, 'tokens.ts'), 'export const spacing = { spacious: 8 };');
    const changed = buildCatalogItems(root, generateCatalog(input), index, provenance).find((item) => item.name === first.name);
    expect(changed.meta.templateFingerprint).not.toBe(first.meta.templateFingerprint);
    expect(changed.meta.contractFingerprint).not.toBe(first.meta.contractFingerprint);
    function read(file) { return file === 'tokens.ts' ? 'export const spacing = { compact: 4 };' : file === 'card.stories.tsx' ? "import { spacing } from './tokens'; export default { title: 'Cards/Test' }; export const Small = { args: { gap: spacing.compact } }; export const Unavailable = {}; " : "export default { title: 'Diagnostics/Local' }; export const LongLabel = {}; "; }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
