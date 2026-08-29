import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function findJavaScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      return findJavaScriptFiles(entryPath);
    }

    return entry.isFile() && /\.[cm]?js$/.test(entry.name) ? [entryPath] : [];
  });
}

export function checkBuiltModuleSyntax(directory) {
  const distDirectory = resolve(directory);
  if (!existsSync(distDirectory)) {
    throw new Error(`Built output directory does not exist: ${distDirectory}`);
  }

  const moduleFiles = findJavaScriptFiles(distDirectory);
  if (moduleFiles.length === 0) {
    throw new Error(`No JavaScript modules found in built output: ${distDirectory}`);
  }

  const failures = [];
  for (const moduleFile of moduleFiles) {
    try {
      execFileSync(
        process.execPath,
        ['--check', moduleFile],
        { encoding: 'utf8', stdio: 'pipe' }
      );
    } catch (error) {
      const detail = error?.stderr?.trim() || error?.message || 'Unknown syntax error';
      failures.push(`${relative(distDirectory, moduleFile)}\n${detail}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Built JavaScript module syntax check failed:\n\n${failures.join('\n\n')}`);
  }

  return moduleFiles.length;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  const distDirectory = process.argv[2] ?? 'apps/standalone/dist';
  const checkedModules = checkBuiltModuleSyntax(distDirectory);
  console.log(`Built module syntax passed: ${checkedModules} JavaScript files`);
}
