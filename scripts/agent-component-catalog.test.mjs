import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
    writeFileSync(component, 'export interface SheetProps { title: string; onClose?: () => void }\nexport function Sheet(props: SheetProps) { return props.title; }');
    writeFileSync(entry, "export { Sheet, type SheetProps } from './sheet';");
    writeFileSync(story, "import { Sheet } from './sheet'; const meta = {title: 'Components/Sheet', component: Sheet}; export default meta; export const Default = {}; ");
    const input = { root, entries: [{ file: entry, importFrom: '@navet/ui' }], stories: [story] };
    const first = generateCatalog(input);
    const sheet = first.entries.find((item) => item.name === 'Sheet');
    expect(sheet.importFrom).toBe('@navet/ui');
    expect(sheet.properties).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'title', optional: false, type: 'string' }),
      expect.objectContaining({ name: 'onClose', optional: true }),
    ]));
    expect(sheet.stories[0]).toMatchObject({ title: 'Components/Sheet', exports: ['Default'] });
    writeFileSync(component, 'export interface SheetProps { title: string; disabled: boolean }\nexport function Sheet(props: SheetProps) { return props.title; }');
    const next = generateCatalog(input);
    expect(next.sourceFingerprint).not.toBe(first.sourceFingerprint);
    expect(next.entries.find((item) => item.name === 'Sheet').properties.map((prop) => prop.name)).toEqual(['title', 'disabled']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
