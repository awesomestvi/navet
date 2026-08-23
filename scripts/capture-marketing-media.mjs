import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { assetPaths, repoRoot } from './repo-paths.mjs';

const CAPTURE_HOST = '127.0.0.1';
const CAPTURE_PORT = 4178;
const DEFAULT_BASE_URL = `http://${CAPTURE_HOST}:${CAPTURE_PORT}`;
const CAPTURE_CACHE_DIR = resolve(repoRoot, '.cache/marketing-media-capture');
const SCREENSHOT_TEMP_DIR = resolve(CAPTURE_CACHE_DIR, 'screenshots');
const VIDEO_TEMP_DIR = resolve(CAPTURE_CACHE_DIR, 'videos');
const WALKTHROUGH_OUTPUT_DIR = resolve(
  assetPaths.marketingRoot,
  'campaigns/live-product-tutorials/recordings/final'
);

const SCREENSHOT_SCENARIOS = [
  {
    name: 'navet-ipad-landscape-home',
    pathname: '/demo/home',
    viewport: { width: 1448, height: 1012 },
  },
  {
    name: 'navet-tablet-portrait-home',
    pathname: '/demo/home',
    viewport: { width: 1024, height: 1366 },
  },
  {
    name: 'navet-mobile-pwa-home',
    pathname: '/demo/home',
    viewport: { width: 390, height: 766 },
    deviceScaleFactor: 2,
    screenshotScale: 'device',
  },
  {
    name: 'navet-ipad-landscape-energy',
    pathname: '/demo/energy',
    viewport: { width: 1536, height: 1024 },
  },
  {
    name: 'navet-ipad-landscape-climate',
    pathname: '/demo/climate',
    viewport: { width: 1536, height: 1024 },
  },
  {
    name: 'navet-ipad-landscape-security',
    pathname: '/demo/security',
    viewport: { width: 1536, height: 1024 },
  },
  {
    name: 'navet-mobile-pwa-media-or-lights',
    pathname: '/demo/lights',
    viewport: { width: 430, height: 932 },
  },
  {
    name: 'navet-ipad-pro-landscape-media',
    pathname: '/demo/media',
    viewport: { width: 1366, height: 1024 },
  },
  {
    name: 'navet-iphone-media',
    pathname: '/demo/media',
    viewport: { width: 430, height: 932 },
  },
  {
    name: 'navet-ipad-landscape-household',
    pathname: '/demo/tasks',
    viewport: { width: 1536, height: 1024 },
  },
  {
    name: 'navet-ipad-landscape-routines',
    pathname: '/demo/tasks',
    viewport: { width: 1536, height: 1024 },
    prepare: async (page) => {
      await page.getByRole('button', { name: 'Routines', exact: true }).click();
    },
  },
];

const DESKTOP_WALKTHROUGH_STEPS = [
  { section: 'Home', holdMs: 1_400 },
  { section: 'Lights', holdMs: 1_800 },
  {
    section: 'Media',
    holdMs: 1_200,
    scrollToHeading: 'Players & speakers',
    postScrollHoldMs: 1_800,
  },
  { section: 'Energy', holdMs: 1_800 },
  { section: 'Security', holdMs: 1_800 },
  { section: 'Home', holdMs: 1_400 },
];

function getArgumentValue(name) {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function getCaptureMode() {
  const requestedMode = getArgumentValue('mode') ?? 'all';
  if (requestedMode === 'all' || requestedMode === 'screenshots' || requestedMode === 'videos') {
    return requestedMode;
  }

  throw new Error(`Unsupported capture mode "${requestedMode}". Use all, screenshots, or videos.`);
}

function getScreenshotScenarios() {
  const requestedScenario = getArgumentValue('scenario');
  if (!requestedScenario) {
    return SCREENSHOT_SCENARIOS;
  }

  const scenario = SCREENSHOT_SCENARIOS.find(({ name }) => name === requestedScenario);
  if (!scenario) {
    throw new Error(
      `Unsupported screenshot scenario "${requestedScenario}". Use one of: ${SCREENSHOT_SCENARIOS.map(({ name }) => name).join(', ')}.`
    );
  }

  return [scenario];
}

function getBaseUrl() {
  return (getArgumentValue('base-url') ?? process.env.NAVET_CAPTURE_BASE_URL ?? DEFAULT_BASE_URL)
    .trim()
    .replace(/\/+$/, '');
}

function shouldStartDemoServer(baseUrl) {
  return baseUrl === DEFAULT_BASE_URL && process.env.NAVET_CAPTURE_SKIP_SERVER !== '1';
}

function startDemoServer() {
  const child = spawn(
    'pnpm',
    [
      '--filter',
      '@navet/demo',
      'dev',
      '--host',
      CAPTURE_HOST,
      '--port',
      String(CAPTURE_PORT),
      '--strictPort',
    ],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        BROWSER: 'none',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  child.stdout.on('data', (chunk) => {
    process.stdout.write(`[demo] ${chunk}`);
  });
  child.stderr.on('data', (chunk) => {
    process.stderr.write(`[demo] ${chunk}`);
  });

  return child;
}

async function waitForDemo(baseUrl, timeoutMs = 45_000) {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/demo/home`);
      if (response.ok) {
        return;
      }
      lastError = new Error(`Demo returned HTTP ${response.status}.`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }

  throw new Error(`Demo did not become ready at ${baseUrl}.`, { cause: lastError });
}

async function stopDemoServer(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolveExit) => child.once('exit', resolveExit)),
    new Promise((resolveDelay) => setTimeout(resolveDelay, 3_000)),
  ]);

  if (child.exitCode === null) {
    child.kill('SIGKILL');
  }
}

async function stabilizePage(page, baseUrl, pathname) {
  await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'networkidle' });
  await page.locator('html[data-navet-preview-runtime="demo"]').waitFor();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images)
        .filter((image) => {
          const bounds = image.getBoundingClientRect();
          return !image.complete && bounds.bottom > 0 && bounds.top < window.innerHeight;
        })
        .map(
          (image) =>
            new Promise((resolveImage) => {
              image.addEventListener('load', resolveImage, { once: true });
              image.addEventListener('error', resolveImage, { once: true });
            })
        )
    );
    window.scrollTo(0, 0);
  });
  await page.addStyleTag({
    content: `
      html {
        caret-color: transparent !important;
        scrollbar-width: none !important;
      }

      html::-webkit-scrollbar,
      body::-webkit-scrollbar {
        display: none !important;
      }
    `,
  });
  await page.waitForTimeout(750);
}

async function writeScreenshotVariants(pngPath, outputBasePath) {
  const image = sharp(pngPath);
  await Promise.all([
    image
      .clone()
      .jpeg({ quality: 92, chromaSubsampling: '4:4:4', mozjpeg: true })
      .toFile(`${outputBasePath}.jpg`),
    image.clone().webp({ quality: 90, effort: 5 }).toFile(`${outputBasePath}.webp`),
    image.clone().avif({ quality: 68, effort: 5 }).toFile(`${outputBasePath}.avif`),
  ]);
}

async function captureScreenshots(browser, baseUrl) {
  await mkdir(SCREENSHOT_TEMP_DIR, { recursive: true });
  await mkdir(assetPaths.marketingScreenshots, { recursive: true });

  for (const scenario of getScreenshotScenarios()) {
    const context = await browser.newContext({
      viewport: scenario.viewport,
      deviceScaleFactor: scenario.deviceScaleFactor ?? 1,
      colorScheme: 'dark',
      reducedMotion: 'reduce',
      serviceWorkers: 'block',
    });
    const page = await context.newPage();
    const pngPath = resolve(SCREENSHOT_TEMP_DIR, `${scenario.name}.png`);
    const outputBasePath = resolve(assetPaths.marketingScreenshots, scenario.name);

    await stabilizePage(page, baseUrl, scenario.pathname);
    if (scenario.prepare) {
      await scenario.prepare(page);
      await page.waitForTimeout(500);
    }
    await page.screenshot({
      path: pngPath,
      animations: 'disabled',
      fullPage: false,
      scale: scenario.screenshotScale ?? 'css',
    });
    await context.close();
    await writeScreenshotVariants(pngPath, outputBasePath);
    process.stdout.write(
      `Captured ${scenario.name} (${scenario.viewport.width}x${scenario.viewport.height}).\n`
    );
  }
}

async function findVisibleSectionButton(page, sectionLabel) {
  const candidates = page.getByRole('button', { name: sectionLabel, exact: true });
  const count = await candidates.count();

  for (let index = 0; index < count; index += 1) {
    const candidate = candidates.nth(index);
    if (await candidate.isVisible()) {
      return candidate;
    }
  }

  throw new Error(`Could not find a visible "${sectionLabel}" navigation button.`);
}

async function captureDesktopWalkthrough(browser, baseUrl) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
    recordVideo: {
      dir: VIDEO_TEMP_DIR,
      size: { width: 1440, height: 900 },
    },
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  const video = page.video();

  await stabilizePage(page, baseUrl, '/demo/home');

  for (const [index, step] of DESKTOP_WALKTHROUGH_STEPS.entries()) {
    if (index > 0) {
      const navigationButton = await findVisibleSectionButton(page, step.section);
      await navigationButton.hover();
      await page.waitForTimeout(300);
      await navigationButton.click();
    }
    await page.waitForTimeout(step.holdMs);
    if (step.scrollToHeading) {
      await page
        .getByRole('heading', { name: step.scrollToHeading, exact: true })
        .scrollIntoViewIfNeeded();
      await page.waitForTimeout(step.postScrollHoldMs ?? 0);
    }
  }

  await context.close();
  await video?.saveAs(resolve(WALKTHROUGH_OUTPUT_DIR, 'navet-dashboard-walkthrough.webm'));
  process.stdout.write('Captured navet-dashboard-walkthrough.webm.\n');
}

async function captureMobileWalkthrough(browser, baseUrl) {
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    colorScheme: 'dark',
    recordVideo: {
      dir: VIDEO_TEMP_DIR,
      size: { width: 430, height: 932 },
    },
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  const video = page.video();

  await stabilizePage(page, baseUrl, '/demo/home');
  await page.waitForTimeout(1_200);

  for (let index = 0; index < 5; index += 1) {
    await page.mouse.wheel(0, 620);
    await page.waitForTimeout(950);
  }

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(1_800);
  await context.close();
  await video?.saveAs(resolve(WALKTHROUGH_OUTPUT_DIR, 'navet-mobile-home-walkthrough.webm'));
  process.stdout.write('Captured navet-mobile-home-walkthrough.webm.\n');
}

async function captureVideos(browser, baseUrl) {
  await mkdir(VIDEO_TEMP_DIR, { recursive: true });
  await mkdir(WALKTHROUGH_OUTPUT_DIR, { recursive: true });
  await captureDesktopWalkthrough(browser, baseUrl);
  await captureMobileWalkthrough(browser, baseUrl);
}

async function main() {
  const mode = getCaptureMode();
  const baseUrl = getBaseUrl();
  const demoServer = shouldStartDemoServer(baseUrl) ? startDemoServer() : null;
  let browser;

  try {
    await mkdir(CAPTURE_CACHE_DIR, { recursive: true });
    await waitForDemo(baseUrl);
    browser = await chromium.launch({ headless: true });

    if (mode === 'all' || mode === 'screenshots') {
      await captureScreenshots(browser, baseUrl);
    }

    if (mode === 'all' || mode === 'videos') {
      await captureVideos(browser, baseUrl);
    }
  } finally {
    await browser?.close();
    await stopDemoServer(demoServer);
    await rm(CAPTURE_CACHE_DIR, { recursive: true, force: true });
  }
}

await main();
