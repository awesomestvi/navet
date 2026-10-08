import { createHash } from 'node:crypto';
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
export function findCompositionViolations(root, files) {
  if (files.length === 0) return [];
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
    const violations = [];
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
      const imported = new Map();
      const namespaceModules = new Map();
      for (const statement of source.statements) {
        if (!ast.isImportDeclaration(statement) || !ast.isStringLiteral(statement.moduleSpecifier)) continue;
        const module = statement.moduleSpecifier.text;
        const canonical = module === '@navet/app/ui-kit/primitives' || module === '@navet/app/components/primitives/sheet-surface' || (module.startsWith('.') && path.resolve(path.dirname(path.resolve(root, file)), module) === path.resolve(root, 'packages/app/src/components/primitives/sheet-surface'));
        if (!canonical) continue;
        const named = statement.importClause?.namedBindings;
        if (named && ast.isNamedImports(named)) for (const specifier of named.elements) imported.set(specifier.name.text, (specifier.propertyName ?? specifier.name).text);
        if (named && ast.isNamespaceImport(named)) namespaceModules.set(named.name.text, module);
      }
      function component(node, seen = new Set()) {
        if (!node || seen.has(node)) return null;
        seen.add(node);
        if (ast.isPropertyAccessExpression(node) && ast.isIdentifier(node.expression) && namespaceModules.has(node.expression.text)) return node.name.text;
        if (!ast.isIdentifier(node)) return null;
        if (imported.has(node.text)) return imported.get(node.text);
        const symbol = project.checker.getSymbolAtLocation(node);
        const declaration = symbol?.valueDeclaration?.resolve();
        return declaration && ast.isVariableDeclaration(declaration) ? component(declaration.initializer, seen) : null;
      }
      const instances = new Map();
      const recorded = new Set();
      function record(rule, node, detail = '') {
        const location = `${rule}:${node.pos}`;
        if (recorded.has(location)) return;
        recorded.add(location);
        const anchor = createHash('sha256').update(node.getText(source).replace(/\s+/g, ' ')).update(detail).digest('hex');
        const key = `${rule}:${anchor}`;
        const occurrence = (instances.get(key) ?? 0) + 1;
        instances.set(key, occurrence);
        violations.push({ file, rule, anchor, occurrence, line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1 });
      }
      function classAlternatives(node, seen = new Set()) {
        if (!node || seen.has(node)) return [''];
        seen = new Set(seen).add(node);
        if (ast.isStringLiteral(node) || ast.isNoSubstitutionTemplateLiteral(node)) return [node.text];
        if (ast.isJsxExpression(node) || ast.isParenthesizedExpression(node) || ast.isAsExpression(node)) return classAlternatives(node.expression, seen);
        if (ast.isTemplateExpression(node)) return [[node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(' ')];
        if (ast.isConditionalExpression(node)) return [...classAlternatives(node.whenTrue, seen), ...classAlternatives(node.whenFalse, seen)];
        if (ast.isIdentifier(node)) {
          const declaration = project.checker.getSymbolAtLocation(node)?.valueDeclaration?.resolve();
          return declaration && ast.isVariableDeclaration(declaration) ? classAlternatives(declaration.initializer, seen) : [''];
        }
        const parts = ast.isCallExpression(node) && ast.isIdentifier(node.expression) && builders.has(node.expression.text)
          ? node.arguments : ast.isArrayLiteralExpression(node) ? node.elements : null;
        if (parts) {
          let values = [''];
          for (const part of parts) values = values.flatMap((prefix) => classAlternatives(part, seen).map((suffix) => `${prefix} ${suffix}`)).slice(0, 64);
          return values;
        }
        return [''];
      }
      const cardConsumer = /^(?:packages\/app\/src\/features\/.*(?:^|[/-])[^/]*card(?:[./-]|$)|packages\/app\/src\/composition-recipes\/card\/)/.test(file) && !file.endsWith('.stories.tsx');
      function inspectCardClasses(value, node) {
        if (!cardConsumer) return;
        const classes = value.split(/\s+/).map((value) => value.split(':').at(-1));
        for (const value of classes) {
          if (/^(?:rounded(?:-[a-z]+)?|text|p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|shadow)-\[(?:#|[0-9])/.test(value) || /^(?:bg|text|border|ring|shadow|from|via|to)-\[(?:#|rgba?\(|hsla?\()/.test(value)) record('card-hardcoded-foundation', node, value);
        }
        if (classes.some((value) => /^rounded-/.test(value)) && classes.some((value) => /^shadow-/.test(value)) && classes.some((value) => /^(?:bg|backdrop-blur)-/.test(value))) record('duplicate-card-surface', node);
      }
      function inspectClasses(node, anchor = node, inspected = new Set()) {
        if (!node || inspected.has(node)) return;
        inspected.add(node);
        for (const value of classAlternatives(node)) {
          if (matchesRecipe(value)) record('duplicate-shell', anchor, value.split(/\s+/).sort().join(' '));
          inspectCardClasses(value, anchor);
        }
        if (ast.isIdentifier(node)) {
          const declaration = project.checker.getSymbolAtLocation(node)?.valueDeclaration?.resolve();
          if (declaration && ast.isVariableDeclaration(declaration)) inspectClasses(declaration.initializer, anchor, inspected);
        } else node.forEachChild((child) => inspectClasses(child, anchor, inspected));
      }
      function visit(node) {
        if (ast.isJsxOpeningElement(node) || ast.isJsxSelfClosingElement(node)) {
          const name = component(node.tagName);
          if (name === 'SheetSurfaceHeader') {
            const element = ast.isJsxOpeningElement(node) ? node.parent : node;
            const parent = element.parent;
            if (!parent || !ast.isJsxElement(parent) || component(parent.openingElement.tagName) !== 'SheetSurface') record('nested-sheet-header', node);
          }
          if (file.startsWith('packages/app/src/composition-recipes/') && !file.endsWith('.stories.tsx') && ['BaseCardDialog', 'SheetSurface', 'ModalSurface'].includes(name)) {
            const focus = node.attributes.properties.find((property) => ast.isJsxAttribute(property) && property.name.getText(source) === 'onCloseAutoFocus');
            if (!focus?.initializer || !ast.isJsxExpression(focus.initializer) || !focus.initializer.expression) record('missing-focus-return', node);
          }
        }
        if (cardConsumer && ast.isJsxAttribute(node) && node.name.getText(source) === 'style' && node.initializer && ast.isJsxExpression(node.initializer) && node.initializer.expression && ast.isObjectLiteralExpression(node.initializer.expression)) {
          for (const property of node.initializer.expression.properties) {
            if (!ast.isPropertyAssignment(property) || !/^(?:background|backgroundColor|color|borderRadius|fontSize|padding|gap|boxShadow)$/.test(property.name.getText(source).replace(/^['"]|['"]$/g, ''))) continue;
            const value = property.initializer;
            if (ast.isNumericLiteral(value) && value.text !== '0' || ast.isStringLiteral(value) && /(?:#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|\d+(?:px|rem|em)\b)/i.test(value.text)) record('card-hardcoded-foundation', property);
          }
        }
        if (ast.isJsxAttribute(node) && /^(?:class|className|.*ClassName)$/.test(node.name.getText(source))) inspectClasses(node.initializer);
        if (ast.isPropertyAssignment(node) && /^(?:class|className|.*ClassName)$/.test(node.name.getText(source).replace(/^['"]|['"]$/g, ''))) inspectClasses(node.initializer);
        if (ast.isCallExpression(node) && ast.isIdentifier(node.expression) && builders.has(node.expression.text)) {
          node.arguments.forEach((argument) => inspectClasses(argument, node));
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

export function findLegacyModalRecipes(root, files) {
  return new Set(findCompositionViolations(root, files).filter((violation) => violation.rule === 'duplicate-shell').map((violation) => violation.file));
}

export function applyCompositionBaseline(violations, baseline) {
  const key = ({ file, rule, anchor, occurrence }) => JSON.stringify([file, rule, anchor, occurrence]);
  const observed = new Set(violations.map(key));
  const accepted = new Set();
  const obsolete = [];
  for (const entry of baseline) {
    if (!entry.reason?.trim() || accepted.has(key(entry))) throw new Error('Invalid or duplicate composition baseline entry');
    accepted.add(key(entry));
    if (!observed.has(key(entry))) obsolete.push(entry);
  }
  return { newViolations: violations.filter((entry) => !accepted.has(key(entry))), obsolete };
}
