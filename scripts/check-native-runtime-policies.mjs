import { spawnSync } from 'node:child_process';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Supply a native njs CLI with PCRE enabled. This tests portable policy semantics,
// not Nginx HTTP handlers, persistence, or container restart behavior.
// Example: node scripts/check-native-runtime-policies.mjs --njs=/path/to/njs
const option = process.argv.slice(2).find((arg) => arg.startsWith('--njs='));
const configuredBinary = option?.slice('--njs='.length) || process.env.NAVET_NJS_BINARY || 'njs';
const binary = configuredBinary.includes('/') && !isAbsolute(configuredBinary)
  ? resolve(configuredBinary)
  : configuredBinary;
const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const result = spawnSync(binary, ['-m', 'native-runtime-policy-smoke.js'], {
  cwd: scriptsDirectory,
  stdio: 'inherit',
});
if (result.error) {
  console.error(
    'Cannot execute native njs. Supply --njs=/path/to/njs or NAVET_NJS_BINARY. ' +
    result.error.message
  );
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
