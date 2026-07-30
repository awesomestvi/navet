#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, '..');
const manifestPath = path.join(repoRoot, 'assets/brand/source/asset-manifest.json');
const tokensPath = path.join(repoRoot, 'assets/brand/source/brand-tokens.json');
const publicManifestPath = path.join(repoRoot, 'assets/public/site.webmanifest');
const standaloneConfigPath = path.join(repoRoot, 'apps/standalone/vite.config.ts');
const pwaCacheConfigPath = path.join(repoRoot, 'scripts/vite-pwa-cache.ts');
const standaloneIndexPath = path.join(repoRoot, 'apps/standalone/index.html');
const demoIndexPath = path.join(repoRoot, 'apps/demo/index.html');
const docsStylesPath = path.join(repoRoot, 'apps/docs/src/styles/navet.css');
const docsContentConfigPath = path.join(repoRoot, 'apps/docs/src/content.config.ts');
const docsAstroConfigPath = path.join(repoRoot, 'apps/docs/astro.config.mjs');
const productFoundationsPath = path.join(
  repoRoot,
  'packages/app/src/components/system/tokens/foundations.ts'
);
const productMotionPath = path.join(
  repoRoot,
  'packages/app/src/components/system/tokens/motion.ts'
);
const socialGeneratorPath = path.join(
  repoRoot,
  'apps/website/scripts/generate-social-card.mjs'
);
const publishedBrandRoutes = [
  ['docs/branding/README.md', 'brand/index', '/brand/'],
  ['docs/branding/BRAND_FOUNDATIONS.md', 'brand/foundations', '/brand/foundations/'],
  ['docs/branding/VOICE_AND_MESSAGING.md', 'brand/voice', '/brand/voice/'],
  ['docs/branding/VISUAL_IDENTITY.md', 'brand/visual', '/brand/visual/'],
  ['docs/branding/CARD_GRAMMAR.md', 'brand/cards', '/brand/cards/'],
  ['docs/branding/ASSET_SYSTEM.md', 'brand/assets', '/brand/assets/'],
  ['docs/branding/GOVERNANCE.md', 'brand/governance', '/brand/governance/'],
  ['docs/branding/TRADEMARK_POLICY.md', 'brand/trademark', '/brand/trademark/'],
];

function resolveRepoPath(filePath) {
  return path.resolve(repoRoot, filePath);
}

function relativeRepoPath(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function expectedSharpFormat(format) {
  return format === 'jpg' ? 'jpeg' : format;
}

function validateManifestShape(manifest) {
  assert(manifest.version === 1, 'asset-manifest.json must use version 1.');
  assert(Array.isArray(manifest.assets), 'asset-manifest.json must contain an assets array.');
  assert(Array.isArray(manifest.mirrors), 'asset-manifest.json must contain a mirrors array.');

  const assetIds = new Set();
  const outputPaths = new Set();

  for (const asset of manifest.assets) {
    assert(typeof asset.id === 'string' && asset.id.length > 0, 'Every brand asset needs an id.');
    assert(!assetIds.has(asset.id), `Duplicate brand asset id: ${asset.id}`);
    assetIds.add(asset.id);
    assert(typeof asset.source === 'string', `Brand asset ${asset.id} needs a source.`);
    if (asset.sourceSha256 !== undefined) {
      assert(
        /^[0-9a-f]{64}$/.test(asset.sourceSha256),
        `Brand asset ${asset.id} has an invalid sourceSha256.`
      );
    }
    assert(Array.isArray(asset.outputs) && asset.outputs.length > 0, `Brand asset ${asset.id} needs outputs.`);

    for (const output of asset.outputs) {
      assert(typeof output.path === 'string', `Brand asset ${asset.id} has an output without a path.`);
      assert(!outputPaths.has(output.path), `Duplicate brand output path: ${output.path}`);
      outputPaths.add(output.path);
      assert(
        ['jpg', 'png', 'svg', 'webmanifest'].includes(output.format),
        `Unsupported format ${output.format} for ${output.path}.`
      );

      if (output.format !== 'webmanifest') {
        assert(Number.isInteger(output.width) && output.width > 0, `${output.path} needs a positive width.`);
        assert(Number.isInteger(output.height) && output.height > 0, `${output.path} needs a positive height.`);
      }
      if (output.format === 'png' || output.format === 'jpg') {
        assert(
          /^[0-9a-f]{64}$/.test(output.sha256 ?? ''),
          `${output.path} needs an approved sha256 so same-size replacement artwork cannot pass.`
        );
      }
    }
  }
}

function validateTokenShape(tokens) {
  assert(tokens.version === 1, 'brand-tokens.json must use version 1.');

  for (const [name, color] of Object.entries({
    orangeStart: tokens.colors?.brand?.orangeStart,
    orangeEnd: tokens.colors?.brand?.orangeEnd,
    darkCanvas: tokens.colors?.canvas?.dark,
    lightCanvas: tokens.colors?.canvas?.light,
    warmAtmosphereStart: tokens.colors?.atmosphere?.warmStart,
    warmAtmosphereEnd: tokens.colors?.atmosphere?.warmEnd,
    blueAtmosphere: tokens.colors?.atmosphere?.blue,
  })) {
    assert(/^#[0-9a-f]{6}$/i.test(color ?? ''), `Brand token ${name} must be a six-digit hex color.`);
  }

  assert(typeof tokens.typography?.family === 'string', 'Brand typography family is missing.');
  assert(tokens.colors.brand.orangeStart === '#f97316', 'The established orange start must remain #f97316.');
  assert(tokens.colors.brand.orangeEnd === '#ea580c', 'The established orange end must remain #ea580c.');
  assert(tokens.colors.canvas.dark === '#06080d', 'The established dark canvas must remain #06080d.');
  assert(tokens.colors.canvas.light === '#fafaf9', 'The established light canvas must remain #fafaf9.');
  assert(tokens.colors.atmosphere.warmStart === '#ffb14f', 'The established warm atmosphere start must remain #ffb14f.');
  assert(tokens.colors.atmosphere.warmEnd === '#ffd18a', 'The established warm atmosphere end must remain #ffd18a.');
  assert(tokens.colors.atmosphere.blue === '#3b82f6', 'The established blue atmosphere must remain #3b82f6.');
  assert(
    tokens.typography.family ===
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'The established system typography stack has changed.'
  );
  assert(tokens.shape?.cardRadiusPx === 24, 'The established card radius token must remain 24px.');
  assert(tokens.shape?.controlRadiusPx === 20, 'The established control radius token must remain 20px.');
  assert(tokens.shape?.pillRadius === 9999, 'The established pill radius token must remain full-round.');
  assert(tokens.motion?.fastMs === 120, 'The established fast motion token must remain 120ms.');
  assert(tokens.motion?.normalMs === 200, 'The established normal motion token must remain 200ms.');
  assert(tokens.motion?.slowMs === 300, 'The established slow motion token must remain 300ms.');
}

async function generateRaster(sourcePath, outputPath, output) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await sharp(sourcePath, { density: 288 })
    .resize(output.width, output.height, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, palette: false })
    .toFile(outputPath);
}

async function generateAssets(manifest) {
  let generatedCount = 0;

  for (const asset of manifest.assets) {
    const sourcePath = resolveRepoPath(asset.source);

    for (const output of asset.outputs) {
      const outputPath = resolveRepoPath(output.path);
      if (sourcePath === outputPath || output.format === 'webmanifest' || output.format === 'jpg') {
        continue;
      }

      if (output.format === 'svg') {
        await mkdir(path.dirname(outputPath), { recursive: true });
        await copyFile(sourcePath, outputPath);
        generatedCount += 1;
        continue;
      }

      if (output.format === 'png') {
        await generateRaster(sourcePath, outputPath, output);
        generatedCount += 1;
      }
    }
  }

  for (const mirror of manifest.mirrors) {
    if (mirror.mode !== 'file') {
      continue;
    }

    const sourcePath = resolveRepoPath(mirror.source);
    for (const target of mirror.targets) {
      const targetPath = resolveRepoPath(target);
      await mkdir(path.dirname(targetPath), { recursive: true });
      await copyFile(sourcePath, targetPath);
      generatedCount += 1;
    }
  }

  console.log(`Generated ${generatedCount} brand asset outputs.`);
}

async function sha256(filePath) {
  return createHash('sha256').update(await readFile(filePath)).digest('hex');
}

async function validateImage(output) {
  const outputPath = resolveRepoPath(output.path);
  const metadata = await sharp(outputPath).metadata();
  assert(
    metadata.format === expectedSharpFormat(output.format),
    `${output.path} is ${metadata.format ?? 'unknown'}, expected ${output.format}.`
  );
  assert(
    metadata.width === output.width && metadata.height === output.height,
    `${output.path} is ${metadata.width ?? '?'}x${metadata.height ?? '?'}, expected ${output.width}x${output.height}.`
  );
}

async function validateOpaqueCanvasEdge(outputPath) {
  const { data, info } = await sharp(resolveRepoPath(outputPath))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const alphaAt = (x, y) => data[(y * info.width + x) * info.channels + info.channels - 1];

  for (let x = 0; x < info.width; x += 1) {
    assert(
      alphaAt(x, 0) === 255 && alphaAt(x, info.height - 1) === 255,
      `${outputPath} must be opaque around the full canvas edge for maskable use.`
    );
  }
  for (let y = 0; y < info.height; y += 1) {
    assert(
      alphaAt(0, y) === 255 && alphaAt(info.width - 1, y) === 255,
      `${outputPath} must be opaque around the full canvas edge for maskable use.`
    );
  }
}

function validatePublicManifest(publicManifest) {
  const expectedIcons = [
    ['/pwa-192.png', '192x192', 'image/png', 'any'],
    ['/pwa-512.png', '512x512', 'image/png', 'any'],
    ['/pwa-maskable-192.png', '192x192', 'image/png', 'maskable'],
    ['/pwa-maskable-512.png', '512x512', 'image/png', 'maskable'],
    ['/favicon.svg', 'any', 'image/svg+xml', 'any'],
  ];

  assert(Array.isArray(publicManifest.icons), 'site.webmanifest must contain icons.');
  assert(publicManifest.icons.length === expectedIcons.length, 'site.webmanifest icon list has drifted.');

  for (const [src, sizes, type, purpose] of expectedIcons) {
    const icon = publicManifest.icons.find((entry) => entry.src === src);
    assert(icon, `site.webmanifest is missing ${src}.`);
    assert(icon.sizes === sizes, `${src} declares ${icon.sizes}, expected ${sizes}.`);
    assert(icon.type === type, `${src} declares ${icon.type}, expected ${type}.`);
    assert(icon.purpose === purpose, `${src} declares ${icon.purpose}, expected ${purpose}.`);
  }
}

function validateStandaloneManifestSource(configSource, pwaCacheConfigSource) {
  assert(
    configSource.includes("assets/public/site.webmanifest"),
    'Standalone PWA config must read the checked public manifest.'
  );
  assert(
    configSource.includes('...publicWebManifest') &&
      configSource.includes('icons: publicWebManifest.icons.map'),
    'Standalone PWA config must derive its manifest and icon declarations from site.webmanifest.'
  );

  assert(
    configSource.includes('...NAVET_PWA_INCLUDE_ASSETS'),
    'Standalone PWA config must use the bounded shared PWA asset list.'
  );

  for (const src of ['pwa-maskable-192.png', 'pwa-maskable-512.png']) {
    assert(
      pwaCacheConfigSource.includes(`'${src}'`),
      `Standalone PWA includeAssets is missing ${src}.`
    );
  }
}

async function validateBrandSourceAlignment(tokens) {
  const docsStyles = await readFile(docsStylesPath, 'utf8');
  assert(
    docsStyles.includes(`--navet-accent: ${tokens.colors.brand.orangeStart};`),
    'The docs accent has drifted from the Navet orange token.'
  );
  assert(
    docsStyles.includes(`--navet-canvas: ${tokens.colors.canvas.dark};`),
    'The docs canvas has drifted from the Navet dark-canvas token.'
  );
  assert(
    docsStyles.includes(`--navet-canvas: ${tokens.colors.canvas.light};`),
    'The docs light canvas has drifted from the Navet light-canvas token.'
  );
  assert(
    docsStyles.includes(`--sl-font: ${tokens.typography.family};`),
    'The docs typography has drifted from the Navet system stack.'
  );
  assert(
    docsStyles.toLowerCase().includes(tokens.colors.atmosphere.blue),
    'The docs blue atmosphere has drifted from the brand token.'
  );

  const productFoundations = await readFile(productFoundationsPath, 'utf8');
  assert(
    productFoundations.includes(`action: 'rounded-[${tokens.shape.controlRadiusPx}px]'`),
    'The product action radius has drifted from the brand control-radius token.'
  );
  assert(
    productFoundations.includes(`panelInset: 'rounded-[${tokens.shape.cardRadiusPx}px]'`),
    'The product panel-inset radius has drifted from the brand card-radius token.'
  );
  assert(
    productFoundations.includes("pill: 'rounded-full'"),
    'The product pill radius has drifted from the full-round brand token.'
  );

  const productMotion = await readFile(productMotionPath, 'utf8');
  for (const [name, duration] of Object.entries(tokens.motion)) {
    assert(
      productMotion.includes(`${name.replace('Ms', '')}: ${duration}`),
      `The product ${name} motion duration has drifted from the brand token.`
    );
  }

  const socialGenerator = await readFile(socialGeneratorPath, 'utf8');
  for (const tokenName of ['warmStart', 'warmEnd', 'blue']) {
    assert(
      socialGenerator.includes(`tokens.colors.atmosphere.${tokenName}`),
      `The social-card generator must consume the ${tokenName} atmosphere token.`
    );
  }

  for (const source of [
    'assets/public/logo.svg',
    'assets/public/logo-horizontal.svg',
    'assets/public/logo-horizontal-light.svg',
    'assets/public/apple-touch-icon.svg',
    'assets/public/favicon.svg',
    'assets/brand/source/app-icon-maskable.svg',
  ]) {
    const artwork = await readFile(resolveRepoPath(source), 'utf8');
    assert(
      artwork.includes(tokens.colors.brand.orangeStart) &&
        artwork.includes(tokens.colors.brand.orangeEnd),
      `${source} has drifted from the locked logo gradient.`
    );
  }

  const standaloneIndex = await readFile(standaloneIndexPath, 'utf8');
  const demoIndex = await readFile(demoIndexPath, 'utf8');
  for (const staleCopy of ['iOS-inspired', 'frosted glass', 'navet.example.com']) {
    assert(!standaloneIndex.includes(staleCopy), `Standalone metadata still contains ${staleCopy}.`);
  }
  assert(
    standaloneIndex.includes('%BASE_URL%navet-social-card.jpg'),
    'Standalone metadata must use the current social preview.'
  );
  assert(
    !demoIndex.includes('sample Home Assistant data') && demoIndex.includes('state-led cards'),
    'Demo metadata must describe the provider-free, card-led product reference.'
  );
}

async function validatePublishedBrandDocs() {
  const contentConfig = await readFile(docsContentConfigPath, 'utf8');
  const astroConfig = await readFile(docsAstroConfigPath, 'utf8');

  for (const [source, id, route] of publishedBrandRoutes) {
    assert(
      contentConfig.includes(`["${source}", "${id}"]`),
      `${source} is missing its ${id} public-docs route.`
    );
    assert(astroConfig.includes(`link: "${route}"`), `${route} is missing from the Brand sidebar.`);

    const markdown = await readFile(resolveRepoPath(source), 'utf8');
    for (const match of markdown.matchAll(/(!?)\[[^\]]+\]\(([^)]+)\)/g)) {
      const isImage = match[1] === '!';
      const target = match[2].trim();
      if (isImage && target.startsWith('media/')) {
        await readFile(resolveRepoPath(path.join(path.dirname(source), target)));
        continue;
      }
      assert(
        /^(?:https?:\/\/|#|mailto:)/.test(target),
        `${source} uses link ${target}, which will not resolve from both GitHub and docs.navet.app. Use a full docs or source URL.`
      );
    }
  }
}

async function checkAssets(manifest, tokens) {
  validateManifestShape(manifest);
  validateTokenShape(tokens);

  let checkedCount = 0;

  for (const asset of manifest.assets) {
    const sourcePath = resolveRepoPath(asset.source);
    await readFile(sourcePath);
    if (asset.sourceSha256) {
      const sourceHash = await sha256(sourcePath);
      assert(
        sourceHash === asset.sourceSha256,
        `${asset.source} has changed from its locked approved source. Explicit brand review and a manifest hash update are required.`
      );
    }

    for (const output of asset.outputs) {
      const outputPath = resolveRepoPath(output.path);
      await readFile(outputPath);

      if (output.format === 'webmanifest') {
        await readJson(outputPath);
      } else {
        await validateImage(output);
      }
      if (output.sha256) {
        const outputHash = await sha256(outputPath);
        assert(
          outputHash === output.sha256,
          `${output.path} no longer matches its approved content checksum. Regenerate it from the approved source and review the result before updating the manifest.`
        );
      } else if (output.format === 'svg' && output.path !== asset.source) {
        const sourceHash = await sha256(sourcePath);
        const outputHash = await sha256(outputPath);
        assert(outputHash === sourceHash, `${output.path} has drifted from ${asset.source}.`);
      }
      checkedCount += 1;
    }
  }

  for (const mirror of manifest.mirrors) {
    if (mirror.mode !== 'file') {
      continue;
    }

    const sourceHash = await sha256(resolveRepoPath(mirror.source));
    for (const target of mirror.targets) {
      const targetHash = await sha256(resolveRepoPath(target));
      assert(sourceHash === targetHash, `${target} has drifted from ${mirror.source}.`);
      checkedCount += 1;
    }
  }

  validatePublicManifest(await readJson(publicManifestPath));
  validateStandaloneManifestSource(
    await readFile(standaloneConfigPath, 'utf8'),
    await readFile(pwaCacheConfigPath, 'utf8')
  );
  await validateBrandSourceAlignment(tokens);
  await validatePublishedBrandDocs();
  await validateOpaqueCanvasEdge('assets/public/pwa-maskable-192.png');
  await validateOpaqueCanvasEdge('assets/public/pwa-maskable-512.png');
  await validateOpaqueCanvasEdge('assets/public/apple-touch-icon.png');

  console.log(`Brand asset check passed for ${checkedCount} outputs and mirrors.`);
  console.log(`Manifest: ${relativeRepoPath(manifestPath)}`);
}

const command = process.argv[2] ?? 'check';
const manifest = await readJson(manifestPath);
const tokens = await readJson(tokensPath);

try {
  validateManifestShape(manifest);
  validateTokenShape(tokens);

  if (command === 'generate') {
    await generateAssets(manifest);
  } else if (command === 'check') {
    await checkAssets(manifest, tokens);
  } else {
    throw new Error(`Unknown brand-assets command "${command}". Use "generate" or "check".`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
