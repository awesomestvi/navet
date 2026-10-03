import path from 'node:path';
import { readImportSpecifiers } from './package-import-policy.mjs';

const FEATURE_ROOT = 'packages/app/src/features';

function targetPath(file, specifier) {
  if (specifier.startsWith('@navet/app/')) {
    return path.posix.normalize(`packages/app/src/${specifier.slice('@navet/app/'.length)}`);
  }
  if (specifier.startsWith('@/app/')) {
    return path.posix.normalize(`packages/app/src/${specifier.slice('@/app/'.length)}`);
  }
  if (specifier.startsWith('.')) {
    return path.posix.normalize(path.posix.join(path.posix.dirname(file.replaceAll('\\', '/')), specifier));
  }
  return null;
}

// Reuse the package-boundary tokenizer: quoted examples and comments are not dependencies.
// Computed runtime module names and transitive dependencies need separate source/runtime review.
export function findUiFeatureImports(file, source) {
  return readImportSpecifiers(source).filter((specifier) => {
    const target = targetPath(file, specifier);
    return target === FEATURE_ROOT || target?.startsWith(`${FEATURE_ROOT}/`);
  });
}
