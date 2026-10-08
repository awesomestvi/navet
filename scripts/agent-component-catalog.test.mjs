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
    const catalog = generateCatalog({ root, entries: [{ file: 'index.ts', importFrom: '@navet/ui' }],
      compilerOptions: { strictNullChecks: true } });
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

it.each([
  "const meta = { title: 'Components/Sheet', component: Sheet }; export default meta;",
  "export default { title: 'Components/Sheet', component: Sheet };",
  "const meta = ({ title: 'Components/Sheet', component: Sheet } satisfies { title: string; component: unknown }); export default meta;",
  "const meta = { 'title': 'Components/Sheet', component: Sheet } as const; export default meta;",
])('reads only the default metadata title despite earlier fixture and nested titles: %s', (metadata) => {
  const root = mkdtempSync(path.join(tmpdir(), 'navet-catalog-story-title-'));
  try {
    writeFileSync(path.join(root, 'index.ts'), 'export function Sheet(props: { title: string }) { return props.title; }');
    writeFileSync(path.join(root, 'sheet.stories.tsx'), `import { Sheet } from './index';
      const items = [{ title: 'Front door is unlocked' }];
      const other = { title: 'Unrelated metadata' };
      ${metadata}
      export const Default = { args: { title: 'Fixture title' } };`);
    const catalog = generateCatalog({ root, entries: [{ file: 'index.ts', importFrom: '@navet/ui' }], stories: ['sheet.stories.tsx'] });
    expect(catalog.entries[0].stories[0]).toMatchObject({ title: 'Components/Sheet', exports: ['Default'] });
  } finally { rmSync(root, { recursive: true, force: true }); }
});

it('associates namespace-enumerated inventory stories with the imported module exports', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'navet-catalog-inventory-'));
  try {
    writeFileSync(path.join(root, 'index.ts'), 'export function Sheet(props: { title: string }) { return props.title; }\nexport const spacing = 4;\nexport interface SheetProps { title: string }\nexport type SheetMode = "compact";');
    writeFileSync(path.join(root, 'inventory.stories.tsx'), `import * as UI from './index';
      const meta = { title: 'Concepts/UI Kit Inventory' }; export default meta;
      export const Inventory = { render: () => Object.keys(UI) };`);
    const catalog = generateCatalog({ root, entries: [{ file: 'index.ts', importFrom: '@navet/ui' }], stories: ['inventory.stories.tsx'] });
    for (const name of ['SheetProps', 'SheetMode']) expect(catalog.entries.find((item) => item.name === name).stories).toEqual([]);
    for (const name of ['Sheet', 'spacing']) expect(catalog.entries.find((item) => item.name === name).stories)
      .toEqual([{ source: 'inventory.stories.tsx', title: 'Concepts/UI Kit Inventory', exports: ['Inventory'] }]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

it('fingerprints effective inherited and explicit compiler options with stable repeated generation', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'navet-catalog-options-'));
  try {
    writeFileSync(path.join(root, 'index.ts'), 'export function Sheet(props: { title?: string }) { return props.title; }');
    writeFileSync(path.join(root, 'base.json'), JSON.stringify({ compilerOptions: { strictNullChecks: false } }));
    writeFileSync(path.join(root, 'tsconfig.json'), JSON.stringify({ extends: './base.json' }));
    const input = { root, entries: [{ file: 'index.ts', importFrom: '@navet/ui' }] };
    const first = generateCatalog(input);
    expect(first.entries[0].properties[0].type).toBe('string');
    expect(generateCatalog(input).sourceFingerprint).toBe(first.sourceFingerprint);
    writeFileSync(path.join(root, 'base.json'), JSON.stringify({ compilerOptions: { strictNullChecks: true } }));
    const inherited = generateCatalog(input);
    expect(inherited.entries[0].properties[0].type).toBe('string | undefined');
    expect(inherited.sourceFingerprint).not.toBe(first.sourceFingerprint);
    const overridden = generateCatalog({ ...input, compilerOptions: { strictNullChecks: false } });
    expect(overridden.entries[0].properties[0].type).toBe('string');
    expect(overridden.sourceFingerprint).not.toBe(inherited.sourceFingerprint);
    expect(generateCatalog({ ...input, compilerOptions: { strictNullChecks: false } }).sourceFingerprint).toBe(overridden.sourceFingerprint);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

it('discovers namespace-only callable contracts without inheriting parent stories', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'navet-catalog-members-'));
  try {
    writeFileSync(path.join(root, 'index.ts'), `
      function Scroll(props: { mode: 'fixed'; height: number } | { mode: 'auto'; label?: string }) { return props.mode; }
      function Frame(props: { title: string } & { active: boolean }) { return props.title; }
      export const Workspace = { ScrollArea: Scroll, Frame, spacing: 8 };
    `);
    writeFileSync(path.join(root, 'workspace.stories.tsx'), "import { Workspace } from './index'; export default { title: 'Workspace', component: Workspace.Frame }; export const Default = {};");
    const input = { root, entries: [{ file: 'index.ts', importFrom: '@navet/ui' }], stories: ['workspace.stories.tsx'] };
    const first = generateCatalog(input);
    const workspace = first.entries.find((entry) => entry.name === 'Workspace');
    expect(workspace.members.map((entry) => entry.name)).toEqual(['Workspace.ScrollArea', 'Workspace.Frame']);
    const scroll = workspace.members[0];
    expect(scroll).toMatchObject({ importFrom: '@navet/ui', source: 'index.ts', stability: 'unclassified', stories: [] });
    expect(scroll.variants).toHaveLength(2);
    expect(scroll.variants[0].properties).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'height', optional: false, type: 'number' }),
    ]));
    expect(workspace.members[1].stories).toHaveLength(1);
    expect(workspace.members[1].properties).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'active', optional: false, type: 'boolean' })]));
    writeFileSync(path.join(root, 'index.ts'), 'function Scroll(props: { disabled: boolean }) { return props.disabled; } export const Workspace = { ScrollArea: Scroll };');
    const next = generateCatalog(input);
    expect(next.sourceFingerprint).not.toBe(first.sourceFingerprint);
    expect(next.entries[0].members[0].properties.map((prop) => prop.name)).toEqual(['disabled']);
    expect(JSON.stringify(next)).not.toContain('symbolKey');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

it('exposes declared interface and union contracts instead of treating type-only exports as values', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'navet-catalog-types-'));
  try {
    writeFileSync(path.join(root, 'index.ts'), 'export interface CardProps { title: string; disabled?: boolean } export type CardSize = "small" | "large"; export type Mode = { kind: "fixed"; height: number } | { kind: "auto" };');
    const catalog = generateCatalog({ root, entries: [{ file: 'index.ts', importFrom: '@navet/ui' }] });
    expect(catalog.entries.find((item) => item.name === 'CardProps').properties).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'title', type: 'string', optional: false })]));
    expect(catalog.entries.find((item) => item.name === 'CardSize').type).toBe('CardSize');
    expect(catalog.entries.find((item) => item.name === 'Mode').variants).toHaveLength(2);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
