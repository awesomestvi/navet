import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const colorsPath = resolve(
  root,
  'packages/app/src/components/shared/theme/theme-colors.ts'
);
const safelistPath = resolve(
  root,
  'packages/app/src/components/shared/theme/theme-color-safelist.ts'
);

const colorsSource = readFileSync(colorsPath, 'utf8');
const safelistSource = readFileSync(safelistPath, 'utf8');

const colorObject = colorsSource.match(
  /export const themeColorValues:[^{]+\{(?<body>[\s\S]*?)\n\};/
);
if (!colorObject?.groups?.body) {
  throw new Error('Could not read themeColorValues from theme-colors.ts');
}

const colors = [...colorObject.groups.body.matchAll(/^\s{2}([a-z]+):\s*'#[0-9a-f]+',?$/gm)].map(
  ([, color]) => color
);
if (colors.length === 0) {
  throw new Error('themeColorValues does not contain any preset colors');
}

const safelistArray = safelistSource.match(
  /export const _themeColorSafelist:[^=]+?=\s*\[(?<body>[\s\S]*?)\]\s*as const;/
);
if (!safelistArray?.groups?.body) {
  throw new Error('Could not read _themeColorSafelist');
}

const safelist = [...safelistArray.groups.body.matchAll(/'([^']+)'/g)].map(([, value]) => value);
const safelistSet = new Set(safelist);
const duplicateClasses = [...new Set(safelist.filter((value, index) => safelist.indexOf(value) !== index))];

const dynamicTemplates = [...colorsSource.matchAll(/`([^`]*\$\{color\}[^`]*)`/g)].flatMap(
  ([, template]) => template.split(/\s+/).filter((token) => token.includes('${color}'))
);
const requiredClasses = colors.flatMap((color) =>
  dynamicTemplates.map((template) => template.replaceAll('${color}', color))
);
const missingDynamicClasses = [...new Set(requiredClasses)].filter(
  (className) => !safelistSet.has(className)
);

const colorPattern = new RegExp(`(${colors.join('|')})`, 'g');
const asymmetricClasses = [];
for (const className of safelistSet) {
  const match = colors.find((color) => className.includes(`-${color}-`));
  if (!match) continue;

  for (const color of colors) {
    const sibling = className.replace(colorPattern, color);
    if (!safelistSet.has(sibling)) {
      asymmetricClasses.push(`${className} -> ${sibling}`);
    }
  }
}

const failures = [];
if (duplicateClasses.length > 0) {
  failures.push(`Duplicate classes:\n${duplicateClasses.map((value) => `  - ${value}`).join('\n')}`);
}
if (missingDynamicClasses.length > 0) {
  failures.push(
    `Dynamic theme classes missing from the safelist:\n${missingDynamicClasses
      .map((value) => `  - ${value}`)
      .join('\n')}`
  );
}
if (asymmetricClasses.length > 0) {
  failures.push(
    `Preset colors do not have symmetrical safelist coverage:\n${asymmetricClasses
      .map((value) => `  - ${value}`)
      .join('\n')}`
  );
}

if (failures.length > 0) {
  console.error(failures.join('\n\n'));
  process.exitCode = 1;
} else {
  console.log(
    `Theme safelist verified: ${safelist.length} classes across ${colors.length} preset colors.`
  );
}
