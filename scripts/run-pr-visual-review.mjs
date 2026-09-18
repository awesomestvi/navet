#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { repoRoot } from './repo-paths.mjs';

const HOST = '127.0.0.1';
const PORT = 4181;
const BASE_URL = `http://${HOST}:${PORT}`;
const OUTPUT_DIR = resolve(repoRoot, process.env.NAVET_PR_REVIEW_OUTPUT ?? '.cache/pr-review');

const scenarios = [
  { name: 'phone-home', path: '/demo/home', viewport: { width: 390, height: 844 } },
  { name: 'tablet-portrait-home', path: '/demo/home', viewport: { width: 1024, height: 1366 } },
  { name: 'tablet-landscape-home', path: '/demo/home', viewport: { width: 1366, height: 1024 } },
  { name: 'desktop-home', path: '/demo/home', viewport: { width: 1440, height: 900 } },
  { name: 'tablet-landscape-lights', path: '/demo/lights', viewport: { width: 1366, height: 1024 } },
  { name: 'tablet-landscape-climate', path: '/demo/climate', viewport: { width: 1366, height: 1024 } },
  { name: 'tablet-landscape-media', path: '/demo/media', viewport: { width: 1366, height: 1024 } },
  { name: 'tablet-landscape-energy', path: '/demo/energy', viewport: { width: 1366, height: 1024 } },
  { name: 'tablet-landscape-security', path: '/demo/security', viewport: { width: 1366, height: 1024 } },
  { name: 'tablet-landscape-tasks', path: '/demo/tasks', viewport: { width: 1366, height: 1024 } },
  { name: 'desktop-settings-dark', path: '/demo/settings', viewport: { width: 1440, height: 900 } },
  {
    name: 'desktop-settings-light',
    path: '/demo/settings',
    viewport: { width: 1440, height: 900 },
    prepare: async (page) => {
      const lightTheme = page.getByRole('button', { name: 'Light', exact: true });
      await lightTheme.click();
      await page.waitForFunction(() =>
        Array.from(document.querySelectorAll('button')).some(
          (button) => button.textContent?.trim() === 'Light' && button.ariaPressed === 'true'
        )
      );
    },
  },
];

function startServer() {
  const child = spawn(
    'pnpm',
    [
      '--filter',
      '@navet/demo',
      'exec',
      'vite',
      'preview',
      '--host',
      HOST,
      '--port',
      String(PORT),
      '--strictPort',
    ],
    {
      cwd: repoRoot,
      env: { ...process.env, BROWSER: 'none' },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  child.stdout.on('data', (chunk) => process.stdout.write(`[demo] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[demo] ${chunk}`));
  return child;
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolveExit) => child.once('exit', resolveExit)),
    new Promise((resolveDelay) => setTimeout(resolveDelay, 3_000)),
  ]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

async function waitForServer(timeoutMs = 45_000) {
  const startedAt = Date.now();
  let lastError;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${BASE_URL}/demo/home`);
      if (response.ok) return;
      lastError = new Error(`Demo returned HTTP ${response.status}.`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error(`Demo did not start at ${BASE_URL}.`, { cause: lastError });
}

async function stabilize(page, path) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });
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
            Promise.race([
              new Promise((resolveImage) => {
                image.addEventListener('load', resolveImage, { once: true });
                image.addEventListener('error', resolveImage, { once: true });
              }),
              new Promise((resolveTimeout) => setTimeout(resolveTimeout, 2_000)),
            ])
        )
    );
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(300);
}

async function inspectPage(page, scenario) {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const unnamedButtons = Array.from(document.querySelectorAll('button'))
      .filter((button) => {
        const style = window.getComputedStyle(button);
        const bounds = button.getBoundingClientRect();
        if (style.display === 'none' || style.visibility === 'hidden' || bounds.width === 0) return false;
        return ![
          button.getAttribute('aria-label'),
          button.getAttribute('title'),
          button.textContent,
        ].some((value) => value?.trim());
      })
      .map((button) => button.outerHTML.slice(0, 180));

    return {
      horizontalOverflow: root.scrollWidth - root.clientWidth,
      visibleButtons: Array.from(document.querySelectorAll('button')).filter(
        (button) => button.getBoundingClientRect().width > 0
      ).length,
      unnamedButtons,
    };
  });

  if (result.horizontalOverflow > 1) {
    throw new Error(`${scenario.name} has ${result.horizontalOverflow}px of horizontal overflow.`);
  }
  if (result.visibleButtons === 0) {
    throw new Error(`${scenario.name} rendered no visible controls.`);
  }
  if (result.unnamedButtons.length > 0) {
    throw new Error(
      `${scenario.name} rendered visible buttons without accessible names:\n${result.unnamedButtons.join('\n')}`
    );
  }
}

await mkdir(OUTPUT_DIR, { recursive: true });
const server = startServer();
let browser;

try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });

  for (const scenario of scenarios) {
    const context = await browser.newContext({
      viewport: scenario.viewport,
      colorScheme: 'dark',
      reducedMotion: 'reduce',
      serviceWorkers: 'block',
    });
    await context.route('https://cloudflareinsights.com/**', async (route) => {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,OPTIONS',
        },
      });
    });
    const page = await context.newPage();
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') runtimeErrors.push(message.text());
    });

    await stabilize(page, scenario.path);
    if (scenario.prepare) await scenario.prepare(page);
    await inspectPage(page, scenario);
    if (runtimeErrors.length > 0) {
      throw new Error(`${scenario.name} emitted runtime errors:\n${runtimeErrors.join('\n')}`);
    }
    await page.screenshot({
      path: resolve(OUTPUT_DIR, `${scenario.name}.png`),
      animations: 'disabled',
      fullPage: true,
    });
    await context.close();
    process.stdout.write(`Reviewed ${scenario.name} (${scenario.viewport.width}x${scenario.viewport.height}).\n`);
  }
} finally {
  await browser?.close();
  await stopServer(server);
}
