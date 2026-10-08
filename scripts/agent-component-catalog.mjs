#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as ast from 'typescript/unstable/ast';
import { API, SignatureKind, SymbolFlags } from 'typescript/unstable/sync';

function storiesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? storiesIn(file) : /\.stories\.tsx?$/.test(entry.name) ? [file] : [];
  });
}

function resolveSymbol(checker, symbol) {
  return symbol?.flags & SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
}

function symbolKey(symbol) {
  const declaration = (symbol?.valueDeclaration ?? symbol?.declarations?.[0])?.resolve();
  return declaration ? `${declaration.getSourceFile().fileName}:${declaration.pos}` : null;
}

// The generated config's temporary path is provenance, not a compiler option.
function canonicalOptions(value, root) {
  if (Array.isArray(value)) return value.map((item) => canonicalOptions(item, root));
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).filter((key) => key !== 'configFilePath').sort()
    .map((key) => [key, canonicalOptions(value[key], root)]));
  if (typeof value === 'string' && path.isAbsolute(value)) return path.relative(root, value).split(path.sep).join('/');
  return value;
}

function storyTitle(source, checker) {
  const assignment = source.statements.find((node) => ast.isExportAssignment(node) && !node.isExportEquals);
  let value = assignment?.expression;
  const seen = new Set();
  while (value && !seen.has(value)) {
    seen.add(value);
    if (ast.isParenthesizedExpression(value) || ast.isAsExpression(value) || ast.isSatisfiesExpression(value)) value = value.expression;
    else if (ast.isIdentifier(value)) {
      const symbol = resolveSymbol(checker, checker.getSymbolAtLocation(value));
      const declaration = (symbol?.valueDeclaration ?? symbol?.declarations?.[0])?.resolve();
      value = declaration && ast.isVariableDeclaration(declaration) ? declaration.initializer : null;
    } else break;
  }
  if (!value || !ast.isObjectLiteralExpression(value)) return null;
  const property = value.properties.find((node) => ast.isPropertyAssignment(node) &&
    (ast.isIdentifier(node.name) || ast.isStringLiteral(node.name)) && node.name.text === 'title');
  return property && ast.isStringLiteral(property.initializer) ? property.initializer.text : null;
}

export function generateCatalog({ root, entries, stories = [], compilerOptions = {} }) {
  root = realpathSync(path.resolve(root));
  entries = entries.map((entry) => ({ ...entry, file: realpathSync(path.resolve(root, entry.file)) }));
  stories = stories.map((file) => realpathSync(path.resolve(root, file)));
  const cache = path.join(root, '.cache/agent-design');
  mkdirSync(cache, { recursive: true });
  const temporary = mkdtempSync(path.join(cache, 'catalog-'));
  const configFile = path.join(temporary, 'tsconfig.json');
  writeFileSync(configFile, JSON.stringify({
    ...(existsSync(path.join(root, 'tsconfig.json')) ? { extends: path.join(root, 'tsconfig.json') } : {}),
    compilerOptions, files: [...entries.map((entry) => entry.file), ...stories], include: [], exclude: [],
  }));
  const api = new API({ cwd: root });
  let snapshot;
  try {
    snapshot = api.updateSnapshot({ openProjects: [configFile] });
    const project = snapshot.getProject(configFile);
    if (!project) throw new Error('Component metadata project did not load.');
    const program = project.program;
    const checker = project.checker;
    const relative = (file) => path.relative(root, file).split(path.sep).join('/');
    const records = [];
    function contractRecord(resolved, name, importFrom) {
      const declaration = (resolved?.valueDeclaration ?? resolved?.declarations?.[0])?.resolve();
      if (!declaration) return null;
      const declarationSource = declaration.getSourceFile();
      if (!declarationSource.fileName.startsWith(`${root}${path.sep}`) || declarationSource.isDeclarationFile) return null;
      const typeOnly = !(resolved.flags & SymbolFlags.Value);
      const type = typeOnly ? checker.getDeclaredTypeOfSymbol(resolved) : checker.getTypeOfSymbolAtLocation(resolved, declaration);
      const signature = checker.getSignaturesOfType(type, SignatureKind.Call)[0];
      const parameter = signature?.getParameters()[0];
      const props = parameter ? checker.getTypeOfSymbolAtLocation(parameter, declaration) : null;
      const shape = props ?? (typeOnly ? type : null);
      const propertiesOf = (contract) => checker.getPropertiesOfType(contract).map((prop) => ({
        name: prop.name, optional: Boolean(prop.flags & SymbolFlags.Optional),
        type: checker.typeToString(checker.getTypeOfSymbolAtLocation(prop, declaration), declaration),
      }));
      return {
        name, importFrom,
        kind: resolved.flags & SymbolFlags.Value ? 'value' : 'type',
        source: relative(declarationSource.fileName),
        line: declarationSource.getLineAndCharacterOfPosition(declaration.getStart()).line + 1,
        description: resolved.getDocumentationComment(checker),
        exportName: name, type: checker.typeToString(type, declaration),
        dependencies: declarationSource.statements.filter(ast.isImportDeclaration).filter((node) => ast.isStringLiteral(node.moduleSpecifier)).map((node) => {
          const module = checker.getSymbolAtLocation(node.moduleSpecifier);
          const dependencySource = module?.declarations?.[0]?.resolve()?.getSourceFile();
          return { importFrom: node.moduleSpecifier.text, source: dependencySource && !dependencySource.isDeclarationFile && dependencySource.fileName.startsWith(`${root}${path.sep}`) ? relative(dependencySource.fileName) : null };
        }),
        parameters: props ? checker.typeToString(props, declaration) : null,
        properties: shape && (shape.isObjectType() || shape.isIntersectionType() || shape.isUnionType() && shape.getTypes().every((type) => type.isObjectType() || type.isIntersectionType())) ? propertiesOf(shape) : [],
        variants: shape?.isUnionType() && shape.getTypes().every((type) => type.isObjectType() || type.isIntersectionType()) ? shape.getTypes().map((contract) => ({
          type: checker.typeToString(contract, declaration), properties: propertiesOf(contract),
        })) : [],
        // Export presence does not prove maturity. Curated usage docs own stability.
        stability: 'unclassified', stories: [], symbolKey: symbolKey(resolved),
      };
    }
    for (const entry of entries) {
      const source = program.getSourceFile(entry.file);
      const module = source && checker.getSymbolAtLocation(source);
      if (!module) throw new Error(`No module metadata for ${entry.file}.`);
      for (const exported of checker.getExportsOfModule(module)) {
        const resolved = resolveSymbol(checker, exported);
        const record = contractRecord(resolved, exported.name, entry.importFrom);
        if (!record) continue;
        // Discover one level of callable namespace members, without expanding
        // type exports, scalar tokens, or callable components' static fields.
        if (record.kind === 'value' && record.parameters === null) {
          const declaration = resolved.valueDeclaration?.resolve();
          if (declaration) {
            const type = checker.getTypeOfSymbolAtLocation(resolved, declaration);
            if (!checker.getSignaturesOfType(type, SignatureKind.Call).length) {
              record.members = checker.getPropertiesOfType(type).flatMap((member) => {
                const memberDeclaration = (member.valueDeclaration ?? member.declarations?.[0])?.resolve();
                if (!memberDeclaration || !checker.getSignaturesOfType(
                  checker.getTypeOfSymbolAtLocation(member, memberDeclaration), SignatureKind.Call).length) return [];
                const contract = contractRecord(member, `${exported.name}.${member.name}`, entry.importFrom);
                return contract ? [{ ...contract, exportName: exported.name, accessPath: member.name }] : [];
              });
            }
          }
        }
        records.push(record);
      }
    }
    const storyFiles = [];
    const packageImport = (file) => {
      const match = /^packages\/([^/]+)\/src\/(.+)\.(?:tsx?|jsx?)$/.exec(relative(file));
      return match ? `@navet/${match[1]}/${match[2]}` : null;
    };
    // Story imports extend the inventory to feature UI, foundations and marketing.
    // Prefer canonical barrels already above; never catalog third-party or provider SDK exports.
    function discover(symbol, exportName, moduleFile) {
      const resolved = resolveSymbol(checker, symbol);
      if (!resolved || records.some((record) => record.symbolKey === symbolKey(resolved))) return;
      const declaration = (resolved.valueDeclaration ?? resolved.declarations?.[0])?.resolve();
      if (!declaration) return;
      const file = declaration.getSourceFile().fileName;
      const importFrom = packageImport(moduleFile ?? file);
      if (!importFrom || /\.stories\.tsx?$/.test(file)) return;
      const record = contractRecord(resolved, exportName, importFrom);
      if (record) records.push(record);
    }
    for (const file of stories) {
      const source = program.getSourceFile(file);
      for (const node of source.statements) {
        if (!ast.isImportDeclaration(node)) continue;
        const moduleFile = checker.getSymbolAtLocation(node.moduleSpecifier)?.declarations?.[0]?.resolve()?.getSourceFile().fileName;
        const clause = node.importClause;
        if (clause?.name) discover(checker.getSymbolAtLocation(clause.name), 'default', moduleFile);
        const named = clause?.namedBindings;
        if (named && ast.isNamedImports(named)) for (const specifier of named.elements) discover(checker.getSymbolAtLocation(specifier.name), (specifier.propertyName ?? specifier.name).text, moduleFile);
        if (named && ast.isNamespaceImport(named)) {
          const module = resolveSymbol(checker, checker.getSymbolAtLocation(named.name));
          if (module) for (const exported of checker.getExportsOfModule(module)) discover(exported, exported.name, moduleFile);
        }
      }
    }
    for (const file of stories) {
      const source = program.getSourceFile(file);
      const title = storyTitle(source, checker);
      const imports = new Set();
      const storyExports = [];
      function visit(node) {
        if (ast.isNamespaceImport(node)) {
          const module = resolveSymbol(checker, checker.getSymbolAtLocation(node.name));
          if (module) for (const exported of checker.getExportsOfModule(module)) {
            const resolved = resolveSymbol(checker, exported);
            if (resolved?.flags & SymbolFlags.Value) imports.add(symbolKey(resolved));
          }
        }
        if (ast.isImportSpecifier(node) || ast.isPropertyAccessExpression(node) || (ast.isImportClause(node) && node.name)) {
          imports.add(symbolKey(resolveSymbol(checker, checker.getSymbolAtLocation(node.name))));
        }
        if (ast.isVariableStatement(node) && node.modifiers?.some((modifier) => modifier.kind === ast.SyntaxKind.ExportKeyword)) {
          for (const declaration of node.declarationList.declarations) if (ast.isIdentifier(declaration.name)) storyExports.push(declaration.name.text);
        }
        node.forEachChild(visit);
      }
      visit(source);
      storyFiles.push({ source: relative(file), title, exports: storyExports, contracts: records.filter((record) => imports.has(record.symbolKey)).map(({ name, importFrom }) => ({ name, importFrom })) });
      for (const record of records.flatMap((record) => [record, ...(record.members ?? [])])) {
        if (imports.has(record.symbolKey)) record.stories.push({ source: relative(file), title, exports: storyExports });
      }
    }
    const fingerprint = createHash('sha256');
    fingerprint.update(JSON.stringify(canonicalOptions(program.getCompilerOptions(), root)));
    fingerprint.update(JSON.stringify(entries.map((entry) => ({ file: relative(entry.file), importFrom: entry.importFrom }))));
    fingerprint.update(JSON.stringify(stories.map(relative)));

    for (const source of program.getSourceFileNames().filter((file) => file.startsWith(`${root}${path.sep}`) && !file.includes(`${path.sep}node_modules${path.sep}`)).sort().map((file) => program.getSourceFile(file))) {
      fingerprint.update(relative(source.fileName)).update(source.text);
    }
    const catalog = {
      version: 2, storyFiles, sourceFingerprint: fingerprint.digest('hex'),
      guidance: ['docs/design-system/README.md', 'docs/design-system/AI-DESIGN-CONTEXT.md', 'ai/skills/navet-ux.md'],
      entries: records.map(({ symbolKey: _key, members, ...record }) => ({ ...record,
        ...(members ? { members: members.map(({ symbolKey: _memberKey, ...member }) => member) } : {}),
      })).sort((a, b) => a.name.localeCompare(b.name)),
    };
    return catalog;
  } finally {
    snapshot?.dispose();
    api.close();
    rmSync(temporary, { recursive: true, force: true });
  }
}

export function generateNavetCatalog(root = process.cwd()) {
  const entries = ['tokens', 'primitives', 'patterns'].map((name) => ({
    file: path.join(root, `packages/app/src/ui-kit/${name}.ts`), importFrom: `@navet/app/ui-kit/${name}`,
  }));
  entries.push(
    { file: path.join(root, 'packages/app/src/features/lighting/components/switch-card.tsx'), importFrom: '@navet/app/features/lighting/components/switch-card' },
    { file: path.join(root, 'packages/app/src/features/weather/components/weather-card/weather-settings-dialog.tsx'), importFrom: '@navet/app/features/weather/components/weather-card/weather-settings-dialog' },
  );
  return generateCatalog({ root, entries, stories: storiesIn(path.join(root, 'packages')) });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = process.cwd();
  const catalog = generateNavetCatalog(root);
  const query = process.argv[2];
  if (query) {
    console.log(JSON.stringify({ sourceFingerprint: catalog.sourceFingerprint, entries: catalog.entries.flatMap((entry) => [entry, ...(entry.members ?? [])]).filter((entry) => `${entry.name} ${entry.source} ${entry.description}`.toLowerCase().includes(query.toLowerCase())) }, null, 2));
  } else {
    const output = path.join(root, '.cache/agent-design/components.json');
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(catalog, null, 2)}\n`);
    console.log(`Generated ${catalog.entries.length} exports at ${path.relative(root, output)}.`);
  }
}
