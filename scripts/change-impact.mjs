const GROUPS = {
  ui: [
    /^packages\/ui\//,
    /^packages\/app\/src\/(components|features|ui-kit|demo|styles)\//,
    /^packages\/app\/src\/(main|App|authenticated-app)\.tsx$/,
    /^apps\/(demo|storybook)\//,
    /\.stories\.[jt]sx?$/,
  ],
  provider: [/^packages\/provider-/, /^packages\/core\//, /provider-(contract|runtime|neutral)/],
  docs: [/^(docs|ai)\//, /^(README|CONTRIBUTING|AGENTS)\.md$/],
  website: [/^apps\/website\//, /^packages\/app\/src\/marketing\//, /^assets\/reference\/marketing\//],
  release: [
    /^\.github\/workflows\/(release|dev-tag)/,
    /(^|\/)Dockerfile$/,
    /^docker\//,
    /^platform\/home-assistant\//,
    /^scripts\/(check-release|sync-release|extract-release|export-hacs|sync-hacs|create-dev-release|set-dev-addon)/,
  ],
  security: [
    /(^|\/)(auth|security)(\/|\.|-)/,
    /(credential|session|oauth|proxy|installation-authority|device-session)/,
    /^SECURITY\.md$/,
  ],
  foundation: [
    /^docs\/product\//,
    /^AGENTS\.md$/,
    /^docs\/architecture\/(package-boundaries|provider-contract|provider-neutral-ui|dashboard-profile-ownership)\.md$/,
    /^docs\/design-system\/UI-GUIDELINES\.md$/,
    /^docs\/branding\/BRAND_FOUNDATIONS\.md$/,
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

export function requiredApprovalGates(impact, labels = []) {
  const labelSet = new Set(labels);
  return {
    product: impact.ui || labelSet.has('gate: product'),
    foundation: impact.foundation || labelSet.has('gate: foundation'),
    security: impact.security || labelSet.has('gate: security'),
  };
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
