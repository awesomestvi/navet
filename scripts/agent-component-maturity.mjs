import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';

const STATUSES = new Set(['stable', 'experimental', 'app-coupled']);
const key = (entry) => JSON.stringify([entry.name, entry.importFrom, entry.source]);

export function applyComponentMaturity(catalog, { root, inventory }) {
  if (inventory?.version !== 1 || !Array.isArray(inventory.components)) {
    throw new Error('Component maturity inventory must use version 1 and a components array.');
  }
  root = realpathSync(root);
  const annotations = new Map();
  const fingerprint = createHash('sha256').update(JSON.stringify(inventory));
  const available = new Set(catalog.entries.map(key));
  for (const entry of inventory.components) {
    if (![entry.name, entry.importFrom, entry.source, entry.rationale].every((value) => typeof value === 'string' && value.trim()) ||
        !STATUSES.has(entry.status) || !Array.isArray(entry.evidence) || entry.evidence.length === 0) {
      throw new Error('Component maturity entries need identity, status, rationale and evidence.');
    }
    const identity = key(entry);
    if (annotations.has(identity)) throw new Error(`Duplicate component maturity entry: ${entry.name}`);
    if (!available.has(identity)) throw new Error(`Component maturity export/source changed: ${entry.name}`);
    for (const reference of [entry.source, ...entry.evidence]) {
      if (typeof reference !== 'string' || path.isAbsolute(reference)) throw new Error('Maturity evidence must use repository-relative paths.');
      const file = realpathSync(path.resolve(root, reference));
      if (!file.startsWith(`${root}${path.sep}`)) throw new Error('Maturity evidence must stay inside the repository.');
      fingerprint.update(reference).update(readFileSync(file));
    }
    annotations.set(identity, entry);
  }
  return {
    ...catalog,
    maturityFingerprint: fingerprint.digest('hex'),
    entries: catalog.entries.map((entry) => {
      const annotation = annotations.get(key(entry));
      return annotation ? {
        ...entry, stability: annotation.status,
        maturity: { rationale: annotation.rationale, evidence: annotation.evidence },
      } : entry;
    }),
  };
}
