import fs from 'node:fs';
import path from 'node:path';

function normalizeValue(value) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeUrl(url) {
  const normalized = normalizeValue(url);
  if (!normalized) {
    return undefined;
  }

  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function loadDotenv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const contents = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = stripQuotes(line.slice(separatorIndex + 1).trim());

    if (!key || process.env[key]) {
      continue;
    }

    process.env[key] = value;
  }
}

loadDotenv();

const runtimeConfig = {};
const hassUrl = normalizeUrl(process.env.NAVET_HASS_URL);

if (hassUrl) {
  runtimeConfig.hassUrl = hassUrl;
}

const distDir = path.resolve(process.cwd(), 'apps/standalone/dist');
if (!fs.existsSync(distDir)) {
  throw new Error('apps/standalone/dist does not exist. Run `pnpm build` before `pnpm preview`.');
}

const outputPath = path.join(distDir, 'config.js');
fs.writeFileSync(
  outputPath,
  `window.__NAVET_CONFIG__ = ${JSON.stringify(runtimeConfig, null, 2)};\n`,
  'utf8'
);

console.log(
  `Wrote ${path.relative(process.cwd(), outputPath)} (hassUrl: ${hassUrl ? 'set' : 'missing'})`
);
