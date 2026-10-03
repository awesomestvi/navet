import { expect, it } from 'vitest';
import { findUiFeatureImports } from './ui-feature-imports.mjs';

const primitive = 'packages/app/src/components/primitives/control.tsx';
it.each([
  "import { Feature } from '@navet/app/features/climate';",
  "import type { State } from '../../features/climate/types';",
  "export * from '../../features/climate';",
  "export {\n Feature\n} from '@/app/features/climate';",
  "import '../../features/climate';",
  "const load = () => import('../../features/climate');",
  "const Feature = require('../../features/climate');",
  "import Feature = require('../../features/climate');",
  "type State = import('../../features/climate').State;",
  "import { Feature } from '@navet/app/components/../features/climate';",
  "import { Feature } from '../../features/lighting/../climate';",
  "const load = () => import(`../../features/climate`);",
])('rejects an actual feature dependency: %s', (source) => {
  expect(findUiFeatureImports(primitive, source)).toHaveLength(1);
});
it.each([
  "import { Button } from './button';",
  "import { Tokens } from '@navet/app/components/system/tokens';",
  "import type { Command } from '@navet/core';",
  "import { Feature } from '@navet/app/features-notes';",
  "// import { Feature } from '../../features/climate';",
  "/* export * from '@navet/app/features/climate'; */",
  `const example = "import { Feature } from '@navet/app/features/climate';";`,
])('accepts shared dependencies or prose: %s', (source) => {
  expect(findUiFeatureImports(primitive, source)).toEqual([]);
});
it('guards relative feature imports from the target UI package too', () => {
  expect(findUiFeatureImports('packages/ui/src/panel.tsx', "export * from '../../app/src/features/climate';")).toEqual(['../../app/src/features/climate']);
});
it('deduplicates one module used by multiple import forms', () => {
  expect(findUiFeatureImports(primitive, "import '../../features/climate'; export * from '../../features/climate';")).toEqual(['../../features/climate']);
});
