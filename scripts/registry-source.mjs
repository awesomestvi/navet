import { existsSync, mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import * as ast from 'typescript/unstable/ast';
import { API, SymbolFlags } from 'typescript/unstable/sync';

export function safeSourcePath(root, file) {
  if (typeof file !== 'string' || !file || file.includes('\\') || path.posix.isAbsolute(file) || file.split('/').some((part) => !part || part === '.' || part === '..')) throw new Error(`Unsafe source path: ${file}`);
  const absolute = path.resolve(root, file);
  if (!existsSync(absolute)) throw new Error(`Missing source: ${file}`);
  if (!realpathSync(absolute).startsWith(`${realpathSync(root)}${path.sep}`)) throw new Error(`Unsafe source path: ${file}`);
  return absolute;
}

export function withSources(root, files, inspect) {
  const cache = path.join(root, '.cache/ui-registry');
  mkdirSync(cache, { recursive: true });
  const temporary = mkdtempSync(path.join(cache, 'sources-'));
  const config = path.join(temporary, 'tsconfig.json');
  writeFileSync(config, JSON.stringify({
    ...(existsSync(path.join(root, 'tsconfig.json')) ? { extends: path.join(root, 'tsconfig.json') } : {}),
    compilerOptions: { jsx: 'react-jsx', noEmit: true },
    files: files.map((file) => safeSourcePath(root, file)), include: [], exclude: [],
  }));
  const api = new API({ cwd: root });
  let snapshot;
  try {
    snapshot = api.updateSnapshot({ openProjects: [config] });
    const project = snapshot.getProject(config);
    if (!project) throw new Error('Registry source project did not load');
    return inspect(project);
  } finally {
    snapshot?.dispose(); api.close(); rmSync(temporary, { recursive: true, force: true });
  }
}

export function exportedNames(project, source) {
  const symbol = project.checker.getSymbolAtLocation(source);
  return new Set(symbol ? project.checker.getExportsOfModule(symbol).map((value) => value.name) : []);
}

// Resolve imported names through the checker, including renamed imports and namespace members.
export function inspectTemplate(project, source, recipe, contracts, installed) {
  const used = new Set();
  const bindings = new Map();
  const allowed = new Set(['react', 'lucide-react', '@navet/app/hooks', ...contracts.map((entry) => entry.importFrom)]);
  function component(name, module) {
    const contract = contracts.find((entry) => entry.name === name && entry.importFrom === module);
    if (!contract) throw new Error(`${recipe.name}: undeclared component import ${name} from ${module}`);
    used.add(name);
  }
  for (const statement of source.statements) {
    if (!ast.isImportDeclaration(statement)) continue;
    if (!ast.isStringLiteral(statement.moduleSpecifier)) throw new Error(`${recipe.name}: nonliteral import`);
    const module = statement.moduleSpecifier.text;
    if (!allowed.has(module)) throw new Error(`${recipe.name}: unexpected template import ${module}`);
    if (['react', 'lucide-react'].includes(module) && !installed.has(module)) throw new Error(`${recipe.name}: missing installed dependency ${module}`);
    const ui = module.startsWith('@navet/app/ui-kit/');
    if (!statement.importClause) throw new Error(`${recipe.name}: side effect import ${module}`);
    const clause = statement.importClause;
    if (ui && clause.name) throw new Error(`${recipe.name}: default UI import is not a named contract`);
    const named = clause.namedBindings;
    if (named && ast.isNamedImports(named)) for (const specifier of named.elements) {
      const imported = (specifier.propertyName ?? specifier.name).text;
      const alias = project.checker.getSymbolAtLocation(specifier.name);
      const resolved = alias?.flags & SymbolFlags.Alias ? project.checker.getAliasedSymbol(alias) : alias;
      if (ui) {
        component(imported, module);
        if (!resolved?.declarations?.length) throw new Error(`${recipe.name}: unresolved component ${imported}`);
        bindings.set(specifier.name.text, { name: imported, module });
      }
    }
    if (ui && named && ast.isNamespaceImport(named)) bindings.set(named.name.text, { module, namespace: true });
  }
  function visit(node) {
    if (ast.isImportEqualsDeclaration(node) || (ast.isCallExpression(node) && (node.expression.kind === ast.SyntaxKind.ImportKeyword || (ast.isIdentifier(node.expression) && node.expression.text === 'require')))) throw new Error(`${recipe.name}: runtime imports are not permitted`);
    if (ast.isJsxOpeningElement(node) || ast.isJsxSelfClosingElement(node)) {
      const parts = node.tagName.getText(source).split('.');
      const binding = bindings.get(parts[0]);
      if (binding && parts.length > 1) component(binding.namespace ? parts.slice(1).join('.') : [binding.name, ...parts.slice(1)].join('.'), binding.module);
    }
    node.forEachChild(visit);
  }
  visit(source);
  for (const contract of contracts) if (!used.has(contract.name)) throw new Error(`${recipe.name}: unused declared component ${contract.name}`);
  if (!exportedNames(project, source).has(recipe.templateExport)) throw new Error(`${recipe.name}: missing template export ${recipe.templateExport}`);
}
