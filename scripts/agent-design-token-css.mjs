import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import postcss from 'postcss';
import { compile } from 'tailwindcss';

const require = createRequire(import.meta.url);
const EXTENSION = 'app.navet.design';
const SUPPORTED = /^(?:gap|p|px|py|min-h|h|w|rounded)-(?:\d+(?:\.\d+)?|\[\d+(?:\.\d+)?(?:px|rem)\])$/;
const PROPERTIES = new Set(['gap', 'padding', 'padding-inline', 'padding-block', 'min-height', 'height', 'width', 'border-radius']);
const NUMBER = '-?\\d+(?:\\.\\d+)?';

function dimensionsIn(css) {
  const tree = postcss.parse(css);
  const variables = new Map();
  tree.walkAtRules('import', (rule) => {
    // Font styles do not contribute to the scalar dimensions exported here.
    if (/^url\(\s*["']?https:\/\/fonts\.googleapis\.com\//i.test(rule.params)) return;
    throw new Error('Unresolved stylesheet import in token export.');
  });
  tree.walkDecls((decl) => {
    if (!decl.prop.startsWith('--')) return;
    const record = variables.get(decl.prop) ?? { values: new Set(), global: false };
    record.values.add(decl.value);
    if (decl.parent.type === 'rule' && /^(?::root|:host)(?:\s*,\s*(?::root|:host))*$/.test(decl.parent.selector) &&
        ![...ancestors(decl.parent)].some(isConditionalAncestor)) record.global = true;
    variables.set(decl.prop, record);
  });
  function resolve(value, seen = new Set()) {
    const literal = value.match(new RegExp(`^(${NUMBER})(px|rem)$`));
    if (literal && Number.isFinite(Number(literal[1]))) return { value: Number(literal[1]), unit: literal[2] };
    const variable = value.match(/^var\((--[\w-]+)\)$/);
    if (variable) {
      const record = variables.get(variable[1]);
      if (!record?.global || record.values.size !== 1 || seen.has(variable[1]) || seen.size > 12) return null;
      return resolve([...record.values][0], new Set([...seen, variable[1]]));
    }
    const product = value.match(new RegExp(`^calc\\(var\\((--[\\w-]+)\\)\\s*\\*\\s*(${NUMBER})\\)$`));
    if (product) {
      const base = resolve(`var(${product[1]})`, seen);
      const result = base && base.value * Number(product[2]);
      return Number.isFinite(result) ? { value: result, unit: base.unit } : null;
    }
    return null;
  }
  return (candidate) => {
    const selector = '.' + candidate.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`);
    const matches = [];
    tree.walkRules((rule) => { if (rule.selector === selector) matches.push(rule); });
    if (matches.length !== 1 || [...ancestors(matches[0])].some(isConditionalAncestor)) return null;
    const declarations = matches[0].nodes.filter((node) => node.type !== 'comment');
    if (!declarations.length || declarations.some((node) => node.type !== 'decl' || !PROPERTIES.has(node.prop) || node.important)) return null;
    const dimensions = declarations.map((decl) => resolve(decl.value));
    if (dimensions.some((value) => !value) || dimensions.some((value) => value.unit !== dimensions[0].unit || value.value !== dimensions[0].value)) return null;
    return { dimension: dimensions[0], properties: declarations.map((decl) => decl.prop) };
  };
}
function isConditionalAncestor(node) { return node.type === 'rule' || (node.type === 'atrule' && node.name !== 'layer'); }
function* ancestors(node) { for (let parent = node?.parent; parent; parent = parent.parent) yield parent; }

// Compile source CSS, never execute UI modules or a stylesheet's JS plugins/configuration.
// Only unconditional scalar dimensions and matching h/w pairs are representable here.
export async function resolveCssDesignTokens({ root, document, cssEntry = 'packages/app/src/styles/index.css' }) {
  root = await realpath(path.resolve(root));
  const tailwindRoot = await realpath(path.dirname(require.resolve('tailwindcss/package.json')));
  const sources = new Map();
  async function load(file) {
    file = await realpath(file);
    if (!file.endsWith('.css') || ![root, tailwindRoot].some((base) => file.startsWith(base + path.sep))) {
      throw new Error('Stylesheet must belong to the checkout or installed Tailwind CSS.');
    }
    const content = await readFile(file, 'utf8');
    sources.set(file, content);
    return { path: file, base: path.dirname(file), content };
  }
  const entry = await load(path.resolve(root, cssEntry));
  const metadata = document?.$extensions?.[EXTENSION];
  if (!metadata || !Number.isSafeInteger(metadata.tokenCount) || metadata.tokenCount < 1 || !Array.isArray(metadata.omitted)) throw new Error('Source-derived token document is required.');
  const strings = metadata.omitted.filter((item) => typeof item.sourceValue === 'string');
  const eligible = strings.map((item) => ({ item, classes: item.sourceValue.split(/\s+/) })).filter(({ classes }) =>
    classes.every((candidate) => SUPPORTED.test(candidate)) && (classes.length === 1 ||
      (classes.length === 2 && classes.some((candidate) => candidate.startsWith('h-')) && classes.some((candidate) => candidate.startsWith('w-')))));
  const compiler = await compile(entry.content, { base: entry.base, from: entry.path,
    loadStylesheet: async (id, base) => load(id.startsWith('.') || path.isAbsolute(id) ? path.resolve(base, id) : require.resolve(id === 'tailwindcss' ? 'tailwindcss/index.css' : id)),
  });
  const css = compiler.build([...new Set(eligible.flatMap((item) => item.classes))]);
  const resolve = dimensionsIn(css);
  const output = structuredClone(document);
  const outputMeta = output.$extensions[EXTENSION];
  let count = 0;
  const resolvedPaths = new Set();
  for (const { item, classes } of eligible) {
    const results = classes.map(resolve);
    if (results.some((result) => !result) || results.some((result) => result.dimension.value !== results[0].dimension.value || result.dimension.unit !== results[0].dimension.unit)) continue;
    const parts = item.path.split('.');
    if (parts.some((part) => !part || /[${}]/.test(part) || ['__proto__', 'constructor', 'prototype'].includes(part))) throw new Error('Unsupported token path.');
    let group = output;
    for (const part of parts.slice(0, -1)) {
      group[part] ??= {};
      group = group[part];
      if ('$value' in group) throw new Error('Token group collides with an existing value.');
    }
    if (Object.hasOwn(group, parts.at(-1))) throw new Error('CSS token collides with an existing value.');
    group[parts.at(-1)] = { $type: 'dimension', $value: results[0].dimension,
      $extensions: { [EXTENSION]: { source: item.source, line: item.line, sourcePath: item.path,
        css: { classes, properties: results.flatMap((result) => result.properties) } } } };
    resolvedPaths.add(item.path);
    count++;
  }
  outputMeta.omitted = outputMeta.omitted.filter((item) => !resolvedPaths.has(item.path) &&
    !(item.reason === 'No representable numeric tokens in this group.' && [...resolvedPaths].some((token) => token.startsWith(item.path + '.'))));
  const dependency = JSON.parse(await readFile(require.resolve('tailwindcss/package.json'), 'utf8'));
  const fingerprint = createHash('sha256').update(dependency.version).update(css);
  const relative = (file) => file.startsWith(root + path.sep) ? path.relative(root, file).split(path.sep).join('/') : 'tailwindcss/' + path.relative(tailwindRoot, file).split(path.sep).join('/');
  for (const [file, content] of [...sources].sort(([left], [right]) => left.localeCompare(right))) fingerprint.update(relative(file)).update(content);
  outputMeta.tokenCount += count;
  outputMeta.css = { sourceEntry: relative(entry.path), sourceFingerprint: fingerprint.digest('hex'),
    compiler: `tailwindcss@${dependency.version}`, resolvedTokens: count, sources: [...sources.keys()].map(relative).sort() };
  return output;
}
