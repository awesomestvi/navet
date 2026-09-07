import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const stable = require('typescript');
const syntax = typeof stable.createScanner === 'function'
  ? stable
  : await import('typescript/unstable/ast');

// Tokenize instead of matching source text: comments and quoted examples are not imports.
// Literal imports cover static/type imports, re-exports, import types, dynamic import,
// and CommonJS/import-equals require. Computed runtime module names are not resolved.
export function readImportSpecifiers(source) {
  const scanner = typeof stable.createScanner === 'function'
    ? stable.createScanner(stable.ScriptTarget.Latest, true, stable.LanguageVariant.Standard, source)
    : syntax.createScanner(true, syntax.LanguageVariant.Standard, source);
  const kind = syntax.SyntaxKind;
  const tokens = [];
  for (let token = scanner.scan(); token !== (kind.EndOfFileToken ?? kind.EndOfFile); token = scanner.scan()) {
    // Native TS scanners need an explicit rescan for a bare # (for example,
    // inside a regular expression). Never retain a zero-width token forever.
    if (!scanner.getTokenText()) {
      token = scanner.reScanInvalidIdentifier();
      if (!scanner.getTokenText()) {
        throw new Error('Package import scanner could not advance');
      }
    }
    tokens.push({ kind: token, text: scanner.getTokenText(), value: scanner.getTokenValue() });
  }
  const imports = new Set();
  const isLiteral = (token) => token && (
    token.kind === kind.StringLiteral || token.kind === kind.NoSubstitutionTemplateLiteral
  );
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1];
    if ((token.kind === kind.FromKeyword || token.kind === kind.ImportKeyword) && isLiteral(next)) {
      imports.add(next.value);
    }
    if (
      (token.kind === kind.ImportKeyword || token.text === 'require') &&
      next?.kind === kind.OpenParenToken && isLiteral(tokens[index + 2])
    ) {
      imports.add(tokens[index + 2].value);
    }
  }
  return [...imports];
}

function packageOwner(file) {
  return file.replaceAll('\\', '/').match(/^packages\/([^/]+)\//)?.[1] ?? null;
}

function importedPackage(file, specifier) {
  const named = specifier.match(/^@navet\/([^/]+)(?:\/|$)/)?.[1];
  if (named) return named;
  if (specifier.startsWith('.')) {
    return packageOwner(path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier)));
  }
  return null;
}

export function checkPackageImports(file, source) {
  const owner = packageOwner(file);
  if (!owner || owner === 'app') return [];
  const violations = [];
  for (const specifier of readImportSpecifiers(source)) {
    const target = importedPackage(file, specifier);
    if (target && target !== owner && target !== 'core') {
      violations.push(`${file}: @navet/${owner} must not import @navet/${target} (${specifier})`);
    }
    if (owner === 'core' && /^(?:react|react-dom)(?:\/|$)/.test(specifier)) {
      violations.push(`${file}: @navet/core must not import React (${specifier})`);
    }
    if ((owner === 'core' || owner === 'ui') && /^home-assistant-js-websocket(?:\/|$)/.test(specifier)) {
      violations.push(`${file}: @navet/${owner} must not import the Home Assistant SDK (${specifier})`);
    }
  }
  return violations;
}
