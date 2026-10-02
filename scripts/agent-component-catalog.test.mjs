import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { it, expect } from 'vitest';
import { generateCatalog } from './agent-component-catalog.mjs';

it('discovers real exports, typed contracts, and story references and refreshes after source changes', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'navet-catalog-'));
  try {
    const component = path.join(root, 'sheet.ts');
    const entry = path.join(root, 'index.ts');
    const story = path.join(root, 'sheet.stories.tsx');
    const namespaceStory = path.join(root, 'namespace.stories.tsx');
    writeFileSync(component, 'export interface SheetProps { title: string; onClose?: () => void }\n/** Searchable sheet documentation. */\nexport function Sheet(props: SheetProps) { return props.title; }');
    writeFileSync(entry, "export { Sheet, type SheetProps } from './sheet';");
    writeFileSync(story, "import { Sheet } from './sheet'; const meta = {title: 'Components/Sheet', component: Sheet}; export default meta; export const Default = {}; ");
    writeFileSync(namespaceStory, "import * as UI from './index'; const meta = {title: 'Components/Namespace', component: UI.Sheet}; export default meta; export const Compact = {};");
    const input = { root, entries: [{ file: entry, importFrom: '@navet/ui' }], stories: [story, namespaceStory] };
    const first = generateCatalog(input);
    const sheet = first.entries.find((item) => item.name === 'Sheet');
    expect(sheet.importFrom).toBe('@navet/ui');
    expect(sheet.description).toBe('Searchable sheet documentation.');
    expect(`${sheet.name} ${sheet.source} ${sheet.description}`.toLowerCase()).toContain('searchable sheet documentation.');
    expect(sheet.properties).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'title', optional: false, type: 'string' }),
      expect.objectContaining({ name: 'onClose', optional: true }),
    ]));
    expect(sheet.stories).toHaveLength(2);
    expect(sheet.stories[1]).toMatchObject({ title: 'Components/Namespace', exports: ['Compact'] });
    expect(sheet.stories[0]).toMatchObject({ title: 'Components/Sheet', exports: ['Default'] });
    const linkedRoot = `${root}-link`;
    try {
      symlinkSync(root, linkedRoot, 'dir');
      const linked = generateCatalog({ root: linkedRoot, entries: [{ file: path.join(linkedRoot, 'index.ts'), importFrom: '@navet/ui' }], stories: [path.join(linkedRoot, 'sheet.stories.tsx'), path.join(linkedRoot, 'namespace.stories.tsx')] });
      expect(linked.entries).toEqual(first.entries);
      expect(linked.sourceFingerprint).toBe(first.sourceFingerprint);
    } finally { rmSync(linkedRoot, { force: true }); }
    writeFileSync(component, 'export interface SheetProps { title: string; disabled: boolean }\nexport function Sheet(props: SheetProps) { return props.title; }');
    const next = generateCatalog(input);
    expect(next.sourceFingerprint).not.toBe(first.sourceFingerprint);
    expect(next.entries.find((item) => item.name === 'Sheet').properties.map((prop) => prop.name)).toEqual(['title', 'disabled']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
