#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const SHARED_DIRS = [
  'packages/app/src/components/primitives',
  'packages/app/src/components/patterns',
  'packages/app/src/components/shared',
  'packages/app/src/components/system',
  'packages/app/src/ui-kit',
];

const PUBLIC_EXPORT_DIRS = ['packages/app/src/components/system', 'packages/app/src/ui-kit'];

const LEGACY_MODAL_ALLOWLIST = new Set([
  'packages/app/src/features/security/components/camera-card/camera-settings-dialog.tsx',
  'packages/app/src/features/security/components/cover-card/view.tsx',
  'packages/app/src/features/climate/components/hvac-settings-dialog/index.tsx',
  'packages/app/src/features/weather/components/weather-card/weather-settings-dialog.tsx',
  'packages/app/src/features/lighting/components/light-card/light-settings-dialog.tsx',
  'packages/app/src/features/lighting/components/switch-settings-dialog.tsx',
]);

function walk(dir) {
  const entries = fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(relativePath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name) || entry.name.includes('.stories.')) {
      continue;
    }

    files.push(relativePath);
  }

  return files;
}

const violations = [];

for (const dir of SHARED_DIRS) {
  for (const relativePath of walk(dir)) {
    const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

    if (source.includes(`/app/features/`)) {
      violations.push(`${relativePath}: shared UI layers must not import from feature modules`);
    }
  }
}

for (const dir of PUBLIC_EXPORT_DIRS) {
  for (const relativePath of walk(dir)) {
    const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

    if (/export\s+.*from\s+['"]@\/app\/features\//.test(source)) {
      violations.push(`${relativePath}: public UI-kit surfaces must not re-export feature modules`);
    }
  }
}

for (const relativePath of [...walk('packages/app/src/components/layout'), ...walk('packages/app/src/features')]) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

  const hasLegacyModalRecipe =
    /(fixed (left-1\/2 top-1\/2|top-1\/2 left-1\/2) z-50 .*shadow-2xl backdrop-blur-xl)/.test(
      source
    ) || /fixed inset-x-0 bottom-0 z-50 .*rounded-\[30px\].*shadow-2xl/.test(source);

  if (hasLegacyModalRecipe && !LEGACY_MODAL_ALLOWLIST.has(relativePath)) {
    violations.push(
      `${relativePath}: use shared ModalSurface or SheetSurface instead of reauthoring shell recipes`
    );
  }
}

if (violations.length > 0) {
  console.error('\nUI kit boundary check failed:\n');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('UI kit boundary check passed.');
