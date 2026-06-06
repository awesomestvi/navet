import { readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { appPaths } from './repo-paths.mjs';

const MAX_ENTRY_JS_BYTES = 100 * 1024;
const MAX_EAGER_CHUNK_BYTES = 2_200 * 1024;
const MAX_MAIN_CSS_BYTES = 550 * 1024;
const LAZY_CHUNK_PREFIXES = [
  'dashboard-card-item-draggable-',
  'dashboard-widget-battery-',
  'dashboard-widget-button-',
  'dashboard-widget-energy-',
  'dashboard-widget-map-',
  'dashboard-widget-note-',
  'dashboard-widget-photo-',
  'dashboard-widget-rss-',
  'dashboard-widget-shared-',
  'dashboard-widgets-',
  'dnd-vendor-',
  'energy-',
  'entity-card-calendar-',
  'entity-card-camera-',
  'entity-card-climate-',
  'entity-card-cover-',
  'entity-card-lighting-',
  'entity-card-lock-',
  'entity-card-media-',
  'entity-card-person-',
  'entity-card-scenes-',
  'entity-card-security-',
  'entity-card-sensors-',
  'entity-card-vacuum-',
  'entity-card-weather-',
  'home-dashboard-overview-edit-',
  'leaflet-vendor-',
  'sections-',
  'settings-',
];

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${bytes} B`;
}

function getSingleMatch(input, pattern, label) {
  const match = input.match(pattern);
  if (!match?.[1]) {
    throw new Error(`Unable to find ${label} in apps/standalone/dist/index.html`);
  }

  return match[1];
}

function assertWithinBudget(label, value, limit) {
  if (value > limit) {
    throw new Error(`${label} exceeds budget: ${formatBytes(value)} > ${formatBytes(limit)}`);
  }
}

const indexHtmlPath = join(appPaths.standaloneDist, 'index.html');
const assetsDir = join(appPaths.standaloneDist, 'assets');
const indexHtml = readFileSync(indexHtmlPath, 'utf8');

const entryScriptPath = getSingleMatch(
  indexHtml,
  /<script[^>]+type="module"[^>]+src="\.\/(assets\/[^"]+\.js)"/,
  'entry module'
);
const mainCssPath = getSingleMatch(
  indexHtml,
  /<link[^>]+rel="stylesheet"[^>]+href="\.\/(assets\/index-[^"]+\.css)"/,
  'main stylesheet'
);

const entryScriptFilePath = join(appPaths.standaloneDist, entryScriptPath);
const entryScriptSize = statSync(entryScriptFilePath).size;
const mainCssSize = statSync(join(appPaths.standaloneDist, mainCssPath)).size;

assertWithinBudget(`Entry bundle ${basename(entryScriptPath)}`, entryScriptSize, MAX_ENTRY_JS_BYTES);
assertWithinBudget(`Main stylesheet ${basename(mainCssPath)}`, mainCssSize, MAX_MAIN_CSS_BYTES);

const entrySource = readFileSync(entryScriptFilePath, 'utf8');
const staticImportMatches = Array.from(
  entrySource.matchAll(/import(?:[^'"]*?from)?["'](\.\/[^"']+\.js)["']/g)
);
const staticImportPaths = staticImportMatches.map((match) => match[1]).filter(Boolean);

for (const importPath of staticImportPaths) {
  const importSize = statSync(join(assetsDir, importPath.replace('./', ''))).size;
  assertWithinBudget(`Eager chunk ${basename(importPath)}`, importSize, MAX_EAGER_CHUNK_BYTES);
}

const eagerLazyImports = staticImportPaths.filter((importPath) =>
  LAZY_CHUNK_PREFIXES.some((prefix) => importPath.includes(prefix))
);

if (eagerLazyImports.length > 0) {
  console.warn(`Warning: entry bundle still eagerly imports lazy chunks: ${eagerLazyImports.join(', ')}`);
}

console.log(
  `Bundle budgets passed: ${basename(entryScriptPath)} ${formatBytes(entryScriptSize)}, ${basename(mainCssPath)} ${formatBytes(mainCssSize)}`
);
