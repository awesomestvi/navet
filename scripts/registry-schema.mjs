import Ajv from 'ajv';
import draft7 from 'ajv/dist/refs/json-schema-draft-07.json' with { type: 'json' };
import { readFileSync } from 'node:fs';
import path from 'node:path';
// Official draft-07 snapshots from ui.shadcn.com/schema, retrieved 2026-10-07.
// Offline validation; review snapshot updates together with pinned CLI compatibility.
const read = (name) => JSON.parse(readFileSync(path.join(import.meta.dirname, 'schemas', `shadcn-${name}.json`), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addMetaSchema({ ...draft7, $id: 'https://json-schema.org/draft-07/schema#' }, 'https://json-schema.org/draft-07/schema');
ajv.addSchema(read('registry-item'), 'https://ui.shadcn.com/schema/registry-item.json');
const validateIndex = ajv.compile(read('registry'));
const validateItem = ajv.getSchema('https://ui.shadcn.com/schema/registry-item.json');
export function validateRegistry(registry) {
  if (!validateIndex(registry)) throw new Error(`shadcn registry schema: ${ajv.errorsText(validateIndex.errors)}`);
  for (const item of registry.items) {
    if (!validateItem(item)) throw new Error(`shadcn item schema (${item.name}): ${ajv.errorsText(validateItem.errors)}`);
    if (item.dependencies?.length || item.devDependencies?.length || item.registryDependencies?.length || ['css', 'cssVars', 'tailwind', 'envVars'].some((key) => key in item)) throw new Error(`${item.name}: compositions must not install dependencies or modify themes/environment`);
  }
  return registry;
}
