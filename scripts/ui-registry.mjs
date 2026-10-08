#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { generateNavetCatalog } from './agent-component-catalog.mjs';
import { exportedNames, inspectTemplate, safeSourcePath, withSources } from './registry-source.mjs';
import { indexItem } from './registry-index.mjs';
import { buildCatalogItems } from './registry-catalog.mjs';
import { validateRegistry } from './registry-schema.mjs';
export const RECIPE_DIRECTORY = 'packages/app/src/composition-recipes';
function templateFiles(root, directory = RECIPE_DIRECTORY) {
  return readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const file = `${directory}/${entry.name}`;
    return entry.isDirectory() ? templateFiles(root, file) : entry.name.endsWith('.tsx') && !entry.name.endsWith('.stories.tsx') ? [file] : [];
  });
}
export const fingerprint = (value) => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
export function sourceRevision(root) {
  try {
    const git = (...args) => execFileSync('git', ['--no-optional-locks', ...args], { cwd: root, encoding: 'utf8' }).trim();
    return { commit: git('rev-parse', 'HEAD'), dirty: Boolean(git('status', '--porcelain', '--untracked-files=normal')) };
  } catch { return { commit: null, dirty: true }; }
}
export function generateStoryIndex(root) {
  const output = path.join(root, '.cache/ui-registry/index.json');
  mkdirSync(path.join(root, '.cache/ui-registry/r'), { recursive: true });
  execFileSync('pnpm', ['exec', 'storybook', 'index', '-c', 'apps/storybook/.storybook', '-o', output, '--disable-telemetry', '--quiet'], { cwd: root, stdio: 'pipe', env: { ...process.env, STORYBOOK: '1' } });
  return JSON.parse(readFileSync(output, 'utf8'));
}
export function resolveStory(index, source, exportName) {
  const match = Object.values(index.entries ?? {}).filter((entry) => entry.type === 'story' && path.posix.normalize(entry.importPath.startsWith('../../') ? path.posix.join('apps/storybook', entry.importPath) : entry.importPath) === source && entry.exportName === exportName);
  if (match.length !== 1) throw new Error(`Missing or ambiguous indexed story: ${source}#${exportName}`);
  return { source, export: exportName, id: match[0].id, href: `?path=/story/${match[0].id}` };
}
export function buildRegistry(root = process.cwd(), catalog = generateNavetCatalog(root), options = {}) {
  const recipes = JSON.parse(readFileSync(path.join(root, RECIPE_DIRECTORY, 'recipes.json'), 'utf8'));
  if (!Array.isArray(recipes) || !recipes.length) throw new Error('Manifest must be a nonempty array');
  const names = new Set();
  for (const recipe of recipes) {
    if (!recipe || !/^[a-z][a-z0-9-]*$/.test(recipe.name) || names.has(recipe.name)) throw new Error(`Invalid or duplicate recipe name: ${recipe?.name}`);
    names.add(recipe.name);
    for (const key of ['title', 'description', 'when', 'family', 'templateExport', 'storyExport', 'reference', 'referenceExport', 'template', 'storySource', 'owner']) if (typeof recipe[key] !== 'string' || !recipe[key].trim()) throw new Error(`${recipe.name}: missing ${key}`);
    for (const key of ['context', 'components', 'review', 'searchTerms', 'states']) if (!Array.isArray(recipe[key]) || !recipe[key].length || recipe[key].some((value) => typeof value !== 'string' || !value.trim()) || new Set(recipe[key]).size !== recipe[key].length) throw new Error(`${recipe.name}: invalid ${key}`);
    if (!['building-block', 'product'].includes(recipe.level)) throw new Error(`${recipe.name}: invalid level`);
    if (!['draft', 'pending', 'approved', 'deprecated'].includes(recipe.reviewStatus)) throw new Error(`${recipe.name}: invalid reviewStatus`);
    if (recipe.reviewStatus === 'approved' && (typeof recipe.acceptance !== 'string' || !recipe.acceptance.trim())) throw new Error(`${recipe.name}: approved recipes require acceptance evidence`);
    if (!recipe.template.startsWith(`${RECIPE_DIRECTORY}/`) || !recipe.template.endsWith('.tsx') || recipe.template.endsWith('.stories.tsx')) throw new Error(`${recipe.name}: invalid template path`);
    if (!recipe.storySource.startsWith(`${RECIPE_DIRECTORY}/`) || !recipe.storySource.endsWith('.stories.tsx')) throw new Error(`${recipe.name}: invalid storySource path`);
    if (recipe.level === 'product' && !recipe.reference.startsWith('packages/app/src/features/')) throw new Error(`${recipe.name}: product requires a feature reference`);
    safeSourcePath(root, recipe.storySource);
    safeSourcePath(root, recipe.reference);
    safeSourcePath(root, recipe.template);
  }
  const declaredTemplates = recipes.map((recipe) => recipe.template);
  if (new Set(declaredTemplates).size !== declaredTemplates.length) throw new Error('Duplicate template path');
  for (const template of templateFiles(root)) if (!declaredTemplates.includes(template)) throw new Error(`Unmanifested template: ${template}`);
  const index = options.index ?? generateStoryIndex(root);
  const revision = options.revision ?? sourceRevision(root);
  const contracts = catalog.entries.flatMap((entry) => [entry, ...(entry.members ?? [])]);
  const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  const installed = new Set(Object.keys({ ...packageJson.dependencies, ...packageJson.peerDependencies }));
  const files = [...new Set(recipes.flatMap((recipe) => [recipe.storySource, recipe.reference, recipe.template]))];
  const items = withSources(root, files, (project) => recipes.map((recipe) => {
    const source = recipe.template;
    const content = readFileSync(path.join(root, source), 'utf8');
    const componentContracts = recipe.components.map((name) => {
      const entry = contracts.find((entry) => entry.name === name && entry.kind === 'value');
      if (!entry) throw new Error(`${recipe.name}: ${name} is not a current UI-kit export`);
      const { importFrom, source, line, parameters, properties, variants } = entry;
      return { name, importFrom, source, line, parameters, properties, variants };
    });
    if (recipe.level === 'product') {
      const featureFamily = recipe.reference.split('/features/')[1].split('/')[0];
      if (!componentContracts.some((contract) => contract.source.startsWith(`packages/app/src/features/${featureFamily}/`))) throw new Error(`${recipe.name}: product requires a same-family feature contract`);
    }
    inspectTemplate(project, project.program.getSourceFile(path.resolve(root, source)), recipe, componentContracts, installed);
    for (const [file, exported, label] of [[recipe.storySource, recipe.storyExport, 'recipe'], [recipe.reference, recipe.referenceExport, 'reference']]) if (!exportedNames(project, project.program.getSourceFile(path.resolve(root, file))).has(exported)) throw new Error(`${recipe.name}: missing ${label} story export ${exported}`);
    const story = resolveStory(index, recipe.storySource, recipe.storyExport);
    const reference = resolveStory(index, recipe.reference, recipe.referenceExport);
    const meta = {
      renderedFingerprint: options.renderedFingerprint ?? null,
      scope: 'navet-app', level: recipe.level, reviewStatus: recipe.reviewStatus, owner: recipe.owner, acceptance: recipe.acceptance ?? null, family: recipe.family, searchTerms: recipe.searchTerms,
      sourceRevision: revision, sourceFingerprint: catalog.sourceFingerprint,
      templateFingerprint: fingerprint(content), contractFingerprint: fingerprint(componentContracts),
      storyFingerprint: fingerprint([readFileSync(path.join(root, recipe.storySource), 'utf8'), readFileSync(path.join(root, recipe.reference), 'utf8'), story, reference]),
      when: recipe.when, context: recipe.context, states: recipe.states, review: recipe.review,
      templateExport: recipe.templateExport, story, reference, contracts: componentContracts,
    };
    meta.compositionFingerprint = fingerprint({ recipe, ...meta });
    return {
      $schema: 'https://ui.shadcn.com/schema/registry-item.json', name: recipe.name, type: 'registry:block', title: recipe.title,
      description: `${recipe.description} Level: ${recipe.level}. Review: ${recipe.reviewStatus}. Owner: ${recipe.owner}. Family: ${recipe.family}. Use when: ${recipe.when} Search: ${recipe.searchTerms.join(', ')}.`,
      dependencies: [], registryDependencies: [],
      files: [{ path: source, type: 'registry:file', target: `@components/recipes/${recipe.name}.tsx`, content }],
      categories: ['navet', 'composition', recipe.level, recipe.reviewStatus, recipe.family],
      docs: `Level: ${recipe.level}. Review: ${recipe.reviewStatus}. Owner: ${recipe.owner}. Acceptance: ${recipe.acceptance ?? 'Awaiting maintainer review'}.\n\nUse when: ${recipe.when}\n\nRequired context:\n${recipe.context.map((value) => `- ${value}`).join('\n')}\n\nStates: ${recipe.states.join(', ')}\n\nReview:\n${recipe.review.map((value) => `- ${value}`).join('\n')}\n\nExecutable example: ${story.href}\nReference: ${reference.href}\nInspect contracts in meta.contracts. Feature owns routing, capabilities, validation and persistence.`, meta,
    };
  }));
  return validateRegistry({ $schema: 'https://ui.shadcn.com/schema/registry.json', name: 'navet', homepage: 'https://github.com/navet-app/navet', items: [...items, ...buildCatalogItems(root, catalog, index, { sourceRevision: revision, renderedFingerprint: options.renderedFingerprint ?? null })] });
}
export function writeRegistry(root, registry, directory = '.cache/ui-registry/r') {
  validateRegistry(registry);
  const output = path.resolve(root, directory);
  const staging = `${output}.next`;
  const previous = `${output}.previous`;
  rmSync(staging, { recursive: true, force: true }); mkdirSync(staging, { recursive: true });
  writeFileSync(path.join(staging, 'registry.json'), `${JSON.stringify({ ...registry, items: registry.items.map(indexItem) }, null, 2)}\n`);
  for (const item of registry.items) {
    if (!/^[a-z][a-z0-9-]*$/.test(item.name)) throw new Error(`Unsafe payload name: ${item.name}`);
    writeFileSync(path.join(staging, `${item.name}.json`), `${JSON.stringify(item, null, 2)}\n`);
  }
  rmSync(previous, { recursive: true, force: true });
  if (existsSync(output)) renameSync(output, previous);
  try { renameSync(staging, output); } catch (error) { if (existsSync(previous)) renameSync(previous, output); throw error; }
  rmSync(previous, { recursive: true, force: true });
  return output;
}
export function serveRegistry(output, port = 7331, state = { error: null }) {
  const server = createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const match = /^\/r\/([a-z][a-z0-9-]*)\.json$/.exec(pathname);
    const file = match && path.join(output, `${match[1]}.json`);
    if (!['GET', 'HEAD'].includes(request.method) || !file) { response.writeHead(404).end(); return; }
    if (state.error) { response.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }).end(JSON.stringify({ error: state.error })); return; }
    if (!existsSync(file)) { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : readFileSync(file));
  });
  server.listen(port, '127.0.0.1', () => console.log(`Navet registry: http://127.0.0.1:${server.address().port}/r/registry.json`));
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [command = 'build', argument] = process.argv.slice(2);
  if (!['build', 'serve', 'publish'].includes(command)) throw new Error('Usage: ui-registry.mjs build | serve [port] | publish [Storybook directory]');
  const root = command === 'publish' ? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..') : process.cwd();
  const destination = command === 'publish' ? path.resolve(process.cwd(), argument ?? 'apps/storybook/dist') : undefined;
  const index = command === 'publish' ? JSON.parse(readFileSync(path.join(destination, 'index.json'), 'utf8')) : undefined;
  const renderedFingerprint = command === 'publish' ? fingerprint([index, readFileSync(path.join(destination, 'iframe.html'), 'utf8')]) : null;
  const registry = buildRegistry(root, undefined, { index, renderedFingerprint });
  const output = writeRegistry(root, registry, command === 'publish' ? path.join(destination, 'r') : undefined);
  console.log(`Built ${registry.items.length} Navet registry items at ${path.relative(root, output)}.`);
  if (command === 'serve') {
    const port = argument ?? '7331';
    if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error('Invalid port');
    serveRegistry(output, Number(port));
  }
}
