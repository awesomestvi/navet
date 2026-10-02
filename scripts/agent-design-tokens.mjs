#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { API, SignatureKind, SymbolFlags } from 'typescript/unstable/sync';

const EXTENSION = 'app.navet.design';
const FORMAT = 'https://www.designtokens.org/tr/2025.10/format/';

function unitFor(parts) {
  const key = parts.at(-1);
  if (key.endsWith('Px')) return { type: 'dimension', unit: 'px' };
  if (key.endsWith('Ms') || parts.includes('durationsMs')) return { type: 'duration', unit: 'ms' };
  if (key === 'fontScale') return { type: 'number' };
  return null;
}

export function generateDesignTokens({ root, file = 'packages/app/src/ui-kit/tokens.ts', compilerOptions = {} }) {
  root = realpathSync(path.resolve(root));
  file = realpathSync(path.resolve(root, file));
  if (!file.startsWith(`${root}${path.sep}`)) throw new Error('Token entry must belong to the checkout.');
  const cache = path.join(root, '.cache/agent-design');
  mkdirSync(cache, { recursive: true });
  const temporary = mkdtempSync(path.join(cache, 'tokens-'));
  const configFile = path.join(temporary, 'tsconfig.json');
  writeFileSync(configFile, JSON.stringify({
    ...(existsSync(path.join(root, 'tsconfig.json')) ? { extends: path.join(root, 'tsconfig.json') } : {}),
    compilerOptions, files: [file], include: [], exclude: [],
  }));
  const api = new API({ cwd: root });
  let snapshot;
  try {
    snapshot = api.updateSnapshot({ openProjects: [configFile] });
    const project = snapshot.getProject(configFile);
    if (!project) throw new Error('Token metadata project did not load.');
    const { program, checker } = project;
    const source = program.getSourceFile(file);
    const module = source && checker.getSymbolAtLocation(source);
    if (!module) throw new Error('Token entry has no module metadata.');
    const relative = (name) => path.relative(root, name).split(path.sep).join('/');
    const omitted = [];
    let count = 0;
    function location(declaration) {
      const source = declaration.getSourceFile();
      if (!source.fileName.startsWith(`${root}${path.sep}`)) throw new Error('Token declaration is outside the checkout.');
      return { source: relative(source.fileName), line: source.getLineAndCharacterOfPosition(declaration.getStart()).line + 1 };
    }
    function visit(type, declaration, parts) {
      if (parts.length > 12) throw new Error('Token structure is recursive or too deep.');
      if (parts.some((key) => /[.${}]/.test(key) || ['__proto__', 'constructor', 'prototype'].includes(key))) {
        throw new Error('Unsupported token name.');
      }
      const units = unitFor(parts);
      if (units && !type.isObjectType()) {
        if (!type.isNumberLiteralType() || !Number.isFinite(type.value)) {
          throw new Error(`Token ${parts.join('.')} must resolve to a finite numeric constant.`);
        }
        count++;
        return {
          $type: units.type,
          $value: units.unit ? { value: type.value, unit: units.unit } : type.value,
          $extensions: { [EXTENSION]: { ...location(declaration), sourcePath: parts.join('.') } },
        };
      }
      if (type.isNumberLiteralType() || type.isStringLiteralType() || type.isBooleanLiteralType() ||
          !type.isObjectType() || checker.getSignaturesOfType(type, SignatureKind.Call).length) {
        omitted.push({ path: parts.join('.'), ...location(declaration), reason: 'Requires source recipe or an explicit supported unit mapping.' });
        return null;
      }
      const group = Object.create(null);
      for (const property of checker.getPropertiesOfType(type)) {
        const child = (property.valueDeclaration ?? property.declarations?.[0])?.resolve();
        if (!child) throw new Error(`Missing declaration for ${property.name}.`);
        const token = visit(checker.getTypeOfSymbolAtLocation(property, child), child, [...parts, property.name]);
        if (token) group[property.name] = token;
      }
      if (!Object.keys(group).length) {
        omitted.push({ path: parts.join('.'), ...location(declaration), reason: 'No representable numeric tokens in this group.' });
        return null;
      }
      return group;
    }
    const tokens = Object.create(null);
    for (const exported of checker.getExportsOfModule(module)) {
      const symbol = exported.flags & SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
      if (!(symbol.flags & SymbolFlags.Value)) continue;
      const declaration = (symbol.valueDeclaration ?? symbol.declarations?.[0])?.resolve();
      if (!declaration) throw new Error(`Missing declaration for ${exported.name}.`);
      const token = visit(checker.getTypeOfSymbolAtLocation(symbol, declaration), declaration, [exported.name]);
      if (token) tokens[exported.name] = token;
    }
    if (!count) throw new Error('No representable tokens found.');
    const fingerprint = createHash('sha256');
    for (const name of program.getSourceFileNames().filter((name) => name.startsWith(`${root}${path.sep}`) &&
        !name.includes(`${path.sep}node_modules${path.sep}`)).sort()) {
      fingerprint.update(relative(name)).update(program.getSourceFile(name).text);
    }
    return {
      $extensions: { [EXTENSION]: {
        version: 1, format: FORMAT, sourceFingerprint: fingerprint.digest('hex'),
        sourceEntry: relative(file), tokenCount: count, omitted,
      } },
      ...tokens,
    };
  } finally {
    snapshot?.dispose();
    api.close();
    rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = process.cwd();
  const tokens = generateDesignTokens({ root });
  const output = path.join(root, '.cache/agent-design/tokens.tokens.json');
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(tokens, null, 2)}\n`);
  console.log(`Generated ${tokens.$extensions[EXTENSION].tokenCount} tokens at ${path.relative(root, output)}.`);
}
