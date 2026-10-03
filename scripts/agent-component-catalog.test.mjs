import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { it, expect } from 'vitest';
import { generateCatalog } from './agent-component-catalog.mjs';

it('links default-imported stories to re-exported default components', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'navet-catalog-default-'));
  try {
    writeFileSync(path.join(root, 'sheet.ts'), 'export default function Sheet(props: { title: string }) { return props.title; }');
    writeFileSync(path.join(root, 'index.ts'), "export { default as Sheet } from './sheet';");
    writeFileSync(path.join(root, 'sheet.stories.tsx'), "import Sheet from './sheet'; const meta = { title: 'Components/Sheet', component: Sheet }; export default meta; export const Default = {};");
    const catalog = generateCatalog({ root, entries: [{ file: 'index.ts', importFrom: '@navet/ui' }], stories: ['sheet.stories.tsx'] });
    expect(catalog.entries.find((item) => item.name === 'Sheet').stories).toEqual([
      { source: 'sheet.stories.tsx', title: 'Components/Sheet', exports: ['Default'] },
    ]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

it('preserves variant-specific properties and discriminator requirements', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'navet-catalog-variants-'));
  try {
    writeFileSync(path.join(root, 'index.ts'), `
      type DialogProps = { variant?: 'card'; anchor: { x: number; y: number } }
        | { variant: 'sheet'; snapPoints?: number[] }
        | { variant: 'fullscreen'; onBack: () => void };
      export function Dialog(props: DialogProps) { return props.variant; }
    `);
    const catalog = generateCatalog({ root, entries: [{ file: 'index.ts', importFrom: '@navet/ui' }] });
    const dialog = catalog.entries.find((item) => item.name === 'Dialog');
    expect(dialog.properties.map((item) => item.name)).toEqual(['variant']);
    expect(dialog.variants).toHaveLength(3);
    const card = dialog.variants.find((item) => item.properties.some((prop) => prop.name === 'anchor'));
    expect(card.properties).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'variant', optional: true, type: '"card" | undefined' }),
      expect.objectContaining({ name: 'anchor', optional: false }),
    ]));
    const fullscreen = dialog.variants.find((item) => item.properties.some((prop) => prop.name === 'onBack'));
    expect(fullscreen.properties).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'variant', optional: false, type: '"fullscreen"' }),
      expect.objectContaining({ name: 'onBack', optional: false, type: '() => void' }),
    ]));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

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
