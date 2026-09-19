const GROUPS = {
  ui: [
    /^packages\/ui\//,
    /^packages\/app\/src\/(components|features|ui-kit|demo|styles)\//,
    /^packages\/app\/src\/(main|App|authenticated-app)\.tsx$/,
    /^apps\/(demo|storybook)\//,
    /\.stories\.[jt]sx?$/,
  ],
  provider: [/^packages\/provider-/, /^packages\/core\//, /provider-(contract|runtime|neutral)/],
  docs: [/^(docs|ai)\//, /^(README|CONTRIBUTING)\.md$/, /(^|\/)AGENTS\.md$/],
  website: [/^apps\/website\//, /^packages\/app\/src\/marketing\//, /^assets\/reference\/marketing\//],
  release: [
    /^\.github\/workflows\/(release|dev-tag)/,
    /^\.changes\//,
    /(^|\/)Dockerfile$/,
    /^docker\//,
    /^platform\/home-assistant\//,
    /^scripts\/(check-release|sync-release|extract-release|generate-release|release-fragments|prepare-addon-release|export-hacs|sync-hacs|create-dev-release|set-dev-addon)/,
  ],
};

export const MANAGED_IMPACT_LABELS = [
  'impact: ui',
  'impact: provider',
  'impact: docs',
  'impact: release',
  'impact: website',
];

export function classifyFiles(files) {
  const normalizedFiles = Array.from(
    new Set(files.map((file) => String(file).replaceAll('\\', '/')).filter(Boolean))
  );
  const impact = Object.fromEntries(
    Object.entries(GROUPS).map(([name, patterns]) => [
      name,
      normalizedFiles.some((file) => patterns.some((pattern) => pattern.test(file))),
    ])
  );

  return { files: normalizedFiles, ...impact };
}

export function impactLabels(impact) {
  return [
    impact.ui && 'impact: ui',
    impact.provider && 'impact: provider',
    impact.docs && 'impact: docs',
    impact.release && 'impact: release',
    impact.website && 'impact: website',
  ].filter(Boolean);
}
