import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { applyComponentMaturity } from './agent-component-maturity.mjs';
import { generateCatalog } from './agent-component-catalog.mjs';

let root;
let entry;
let catalog;
let inventory;
beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'navet-maturity-test-'));
  writeFileSync(path.join(root, 'sheet.ts'), 'export function Sheet(props: { title: string }) { return props.title; }');
  writeFileSync(path.join(root, 'sheet.stories.tsx'), "import { Sheet } from './sheet'; export default { component: Sheet };");
  entry = { name: 'Sheet', importFrom: '@navet/ui', source: 'sheet.ts', stability: 'unclassified' };
  catalog = { sourceFingerprint: 'source-only', entries: [entry, { ...entry, name: 'Other' }] };
  inventory = { version: 1, components: [{ ...entry, status: 'app-coupled', rationale: 'Requires app theme context.', evidence: ['sheet.stories.tsx'] }] };
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

it('annotates the actual export and leaves uninspected exports unclassified', () => {
  const actual = generateCatalog({ root, entries: [{ file: 'sheet.ts', importFrom: '@navet/ui' }], maturityInventory: inventory });
  expect(actual.entries[0]).toMatchObject({ name: 'Sheet', stability: 'app-coupled', maturity: { rationale: 'Requires app theme context.' } });
  const result = applyComponentMaturity(catalog, { root, inventory });
  expect(result.entries[1].stability).toBe('unclassified');
  expect(catalog.entries[0].stability).toBe('unclassified');
});
it.each(['name', 'source', 'importFrom'])('rejects stale export identity when %s changes', (field) => {
  catalog.entries[0] = { ...entry, [field]: 'moved' };
  expect(() => applyComponentMaturity(catalog, { root, inventory })).toThrow('export/source changed');
});
it('rejects disappeared story evidence', () => {
  rmSync(path.join(root, 'sheet.stories.tsx'));
  expect(() => applyComponentMaturity(catalog, { root, inventory })).toThrow();
});
it('refreshes guidance fingerprint when evidence changes without overwriting source fingerprint', () => {
  const first = applyComponentMaturity(catalog, { root, inventory });
  writeFileSync(path.join(root, 'sheet.stories.tsx'), 'export const ErrorState = {};');
  const next = applyComponentMaturity(catalog, { root, inventory });
  expect(next.maturityFingerprint).not.toBe(first.maturityFingerprint);
  expect(next.sourceFingerprint).toBe('source-only');
});
it('refreshes guidance fingerprint when the classification changes', () => {
  const first = applyComponentMaturity(catalog, { root, inventory });
  inventory.components[0].status = 'experimental';
  const next = applyComponentMaturity(catalog, { root, inventory });
  expect(next.entries[0].stability).toBe('experimental');
  expect(next.maturityFingerprint).not.toBe(first.maturityFingerprint);
});
it('rejects competing classifications for the same export', () => {
  inventory.components.push({ ...inventory.components[0], status: 'stable' });
  expect(() => applyComponentMaturity(catalog, { root, inventory })).toThrow('Duplicate');
});
it('rejects unrecognized stability categories', () => {
  inventory.components[0].status = 'looks-good';
  expect(() => applyComponentMaturity(catalog, { root, inventory })).toThrow('status');
});
it('rejects evidence outside the repository', () => {
  inventory.components[0].evidence = [path.join(root, 'sheet.stories.tsx')];
  expect(() => applyComponentMaturity(catalog, { root, inventory })).toThrow('repository-relative');
});
