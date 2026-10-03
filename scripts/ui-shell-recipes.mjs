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
      function visit(node) {
        const value = ast.isStringLiteral(node) || ast.isNoSubstitutionTemplateLiteral(node)
          ? node.text
          : ast.isTemplateExpression(node)
            ? [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(' ')
            : null;
        if (value !== null && matchesRecipe(value)) violations.add(file);
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
