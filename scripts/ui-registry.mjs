#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateNavetCatalog } from './agent-component-catalog.mjs';

const RECIPE_DIRECTORY = 'packages/app/src/ui-kit/registry';
const STORY_SOURCE = 'packages/app/src/ui-kit/registry/registry.stories.tsx';

// This builder deliberately distributes compositions. Shared implementations remain imports.
export function buildRegistry(root = process.cwd(), catalog = generateNavetCatalog(root)) {
  const recipes = JSON.parse(readFileSync(path.join(root, RECIPE_DIRECTORY, 'recipes.json'), 'utf8'));
  const contracts = catalog.entries.flatMap((entry) => [entry, ...(entry.members ?? [])]);
  const storySource = readFileSync(path.join(root, STORY_SOURCE), 'utf8');
  const names = new Set();
  const items = recipes.map((recipe) => {
    if (!/^[a-z][a-z0-9-]*$/.test(recipe.name) || names.has(recipe.name)) {
      throw new Error(`Invalid or duplicate recipe name: ${recipe.name}`);
    }
    names.add(recipe.name);
    for (const key of ['title', 'description', 'when', 'storyExport', 'reference']) {
      if (!recipe[key]) throw new Error(`${recipe.name}: missing ${key}`);
    }
    for (const key of ['context', 'components', 'review']) {
      if (!Array.isArray(recipe[key]) || !recipe[key].length) throw new Error(`${recipe.name}: missing ${key}`);
    }
    if (!existsSync(path.join(root, recipe.reference))) throw new Error(`${recipe.name}: missing reference story`);
    if (!new RegExp(`export const ${recipe.storyExport}\\b`).test(storySource)) {
      throw new Error(`${recipe.name}: missing recipe story export`);
    }
    const source = `${RECIPE_DIRECTORY}/${recipe.name}.tsx`;
    const content = readFileSync(path.join(root, source), 'utf8');
    const componentContracts = recipe.components.map((name) => {
      const entry = contracts.find((entry) => entry.name === name && entry.kind === 'value');
      if (!entry) throw new Error(`${recipe.name}: ${name} is not a current UI-kit export`);
      const { importFrom, source, line, parameters, properties, variants } = entry;
      return { name, importFrom, source, line, parameters, properties, variants };
    });
    const allowed = new Set(['react', 'lucide-react', '@navet/app/hooks', ...componentContracts.map((entry) => entry.importFrom)]);
    for (const match of content.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      if (!allowed.has(match[1])) throw new Error(`${recipe.name}: unexpected template import ${match[1]}`);
    }
    const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    const dependencies = Object.keys({ ...packageJson.dependencies, ...packageJson.peerDependencies });
    for (const specifier of ['react', 'lucide-react'].filter((specifier) => content.includes(`from '${specifier}'`))) {
      if (!dependencies.includes(specifier)) throw new Error(`${recipe.name}: missing installed dependency ${specifier}`);
    }
    return {
      $schema: 'https://ui.shadcn.com/schema/registry-item.json',
      name: recipe.name,
      type: 'registry:block',
      title: recipe.title,
      description: `${recipe.description} Use when: ${recipe.when} Context: ${recipe.context.join('; ')}. Pilot recipe. Inspect the full template and current contracts with shadcn view @navet/${recipe.name}; review Concepts/Registry Recipes (${recipe.storyExport}).`,
      // External packages are supplied by Navet; installing a recipe never changes dependencies or themes.
      dependencies: [],
      registryDependencies: [],
      files: [{ path: source, type: 'registry:file', target: `@components/recipes/${recipe.name}.tsx`, content }],
      categories: ['navet', 'composition'],
      docs: `Use when: ${recipe.when}\n\nRequired context:\n${recipe.context.map((value) => `- ${value}`).join('\n')}\n\nReview:\n${recipe.review.map((value) => `- ${value}`).join('\n')}\n\nSee docs/design-system/REGISTRY.md and ${recipe.reference}.`,
      meta: {
        maturity: 'pilot',
        scope: 'navet-app',
        sourceFingerprint: catalog.sourceFingerprint,
        templateFingerprint: createHash('sha256').update(content).digest('hex'),
        when: recipe.when,
        context: recipe.context,
        review: recipe.review,
        story: { source: STORY_SOURCE, export: recipe.storyExport },
        reference: recipe.reference,
        contracts: componentContracts,
      },
    };
  });
  return {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: 'navet',
    homepage: 'https://github.com/navet-app/navet',
    items,
  };
}

export function writeRegistry(root, registry) {
  const output = path.join(root, '.cache/ui-registry/r');
  // Remove stale recipes when the curated manifest changes.
  rmSync(output, { recursive: true, force: true });
  mkdirSync(output, { recursive: true });
  writeFileSync(path.join(output, 'registry.json'), `${JSON.stringify(registry, null, 2)}\n`);
  for (const item of registry.items) writeFileSync(path.join(output, `${item.name}.json`), `${JSON.stringify(item, null, 2)}\n`);
  return output;
}

export function serveRegistry(output, port = 7331) {
  const server = createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const match = /^\/r\/([a-z][a-z0-9-]*)\.json$/.exec(pathname);
    const file = match && path.join(output, `${match[1]}.json`);
    if (!['GET', 'HEAD'].includes(request.method) || !file || !existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : readFileSync(file));
  });
  server.listen(port, '127.0.0.1', () => console.log(`Navet registry: http://127.0.0.1:${server.address().port}/r/registry.json`));
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [command = 'build', port = '7331'] = process.argv.slice(2);
  if (!['build', 'serve'].includes(command) || process.argv.length > (command === 'serve' ? 4 : 3)) {
    throw new Error('Usage: node scripts/ui-registry.mjs build | serve [port]');
  }
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error('Invalid port');
  const registry = buildRegistry();
  const output = writeRegistry(process.cwd(), registry);
  console.log(`Built ${registry.items.length} Navet recipes at ${path.relative(process.cwd(), output)}.`);
  if (command === 'serve') serveRegistry(output, Number(port));
}
