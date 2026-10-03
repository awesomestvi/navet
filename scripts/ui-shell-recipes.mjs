import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import * as ast from 'typescript/unstable/ast';
import { API } from 'typescript/unstable/sync';

function matchesRecipe(value) {
  const classes = new Set(value.split(/\s+/));
  const includes = (...required) => required.every((name) => classes.has(name));
  return includes('fixed', 'z-50', 'shadow-2xl') && (
    includes('left-1/2', 'top-1/2', 'backdrop-blur-xl') ||
    includes('inset-x-0', 'bottom-0', 'rounded-[30px]')
  );
}

// Parse static literal values so comments, escapes and utility order are handled correctly.
// Dynamic expressions and computed CSS equivalence remain outside this focused guard.
export function findLegacyModalRecipes(root, files) {
  if (files.length === 0) return new Set();
  const temporary = mkdtempSync(path.join(tmpdir(), 'navet-ui-shells-'));
  const config = path.join(temporary, 'tsconfig.json');
  writeFileSync(config, JSON.stringify({
    compilerOptions: { noResolve: true, noLib: true, allowJs: true, jsx: 'preserve' },
    files: files.map((file) => path.resolve(root, file)), include: [], exclude: [],
  }));
  const api = new API({ cwd: root });
  let snapshot;
  try {
    snapshot = api.updateSnapshot({ openProjects: [config] });
    const project = snapshot.getProject(config);
    if (!project) throw new Error('UI shell source project did not load.');
    const violations = new Set();
    for (const file of files) {
      const source = project.program.getSourceFile(path.resolve(root, file));
      if (!source) throw new Error(`UI shell source did not load: ${file}`);
      const builders = new Set(['cn', 'clsx', 'classnames', 'classNames', 'twMerge', 'cva']);
      for (const statement of source.statements) {
        if (!ast.isImportDeclaration(statement) || !ast.isStringLiteral(statement.moduleSpecifier)) continue;
        const module = statement.moduleSpecifier.text;
        const clause = statement.importClause;
        if (['clsx', 'classnames', 'tailwind-merge', 'class-variance-authority'].includes(module) && clause?.name) builders.add(clause.name.text);
        if (clause?.namedBindings && ast.isNamedImports(clause.namedBindings)) {
          for (const specifier of clause.namedBindings.elements) {
            if (builders.has((specifier.propertyName ?? specifier.name).text)) builders.add(specifier.name.text);
          }
        }
      }
      const inspected = new Set();
      function inspectClasses(node) {
        if (!node || inspected.has(node)) return;
        inspected.add(node);
        const value = ast.isStringLiteral(node) || ast.isNoSubstitutionTemplateLiteral(node)
          ? node.text
          : ast.isTemplateExpression(node)
            ? [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(' ')
            : null;
        if (value !== null && matchesRecipe(value)) violations.add(file);
        if (ast.isIdentifier(node)) {
          const symbol = project.checker.getSymbolAtLocation(node);
          const declaration = symbol?.valueDeclaration?.resolve();
          if (declaration && ast.isVariableDeclaration(declaration)) inspectClasses(declaration.initializer);
        } else if (ast.isConditionalExpression(node)) {
          inspectClasses(node.whenTrue); inspectClasses(node.whenFalse);
        } else node.forEachChild(inspectClasses);
      }
      function visit(node) {
        if (ast.isJsxAttribute(node) && /^(?:class|className|.*ClassName)$/.test(node.name.getText(source))) inspectClasses(node.initializer);
        if (ast.isPropertyAssignment(node) && /^(?:class|className|.*ClassName)$/.test(node.name.getText(source).replace(/^['"]|['"]$/g, ''))) inspectClasses(node.initializer);
        if (ast.isCallExpression(node) && ast.isIdentifier(node.expression) && builders.has(node.expression.text)) {
          node.arguments.forEach(inspectClasses);
        }
        node.forEachChild(visit);
      }
      visit(source);
    }
    return violations;
  } finally {
    snapshot?.dispose();
    api.close();
    rmSync(temporary, { recursive: true, force: true });
  }
}
