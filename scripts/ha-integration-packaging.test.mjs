import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';
import { afterEach, describe, expect, it } from 'vitest';
import { assembleHomeAssistantIntegration } from './assemble-ha-integration.mjs';

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true })
    )
  );
});

describe('Home Assistant integration packaging', () => {
  it('assembles Python source with the fresh panel build and ignores a stale source bundle', async () => {
    const root = await mkdtemp(join(tmpdir(), 'navet-ha-integration-'));
    temporaryDirectories.push(root);

    const sourceRoot = join(root, 'source');
    const panelDist = join(root, 'panel-dist');
    const destination = join(root, 'export', 'custom_components', 'navet');

    await mkdir(join(sourceRoot, 'frontend'), { recursive: true });
    await mkdir(join(panelDist, 'assets'), { recursive: true });
    await writeFile(join(sourceRoot, '__init__.py'), '# integration source\n');
    await writeFile(join(sourceRoot, 'frontend', 'navet-panel.js'), 'stale panel\n');
    await writeFile(join(panelDist, 'navet-panel.js'), 'fresh panel\n');
    await writeFile(join(panelDist, 'navet-ha-shell.js'), 'fresh shell\n');
    await writeFile(join(panelDist, 'assets', 'app.js'), 'fresh chunk\n');

    await assembleHomeAssistantIntegration({ sourceRoot, panelDist, destination });

    await expect(readFile(join(destination, '__init__.py'), 'utf8')).resolves.toBe(
      '# integration source\n'
    );
    await expect(readFile(join(destination, 'frontend', 'navet-panel.js'), 'utf8')).resolves.toBe(
      'fresh panel\n'
    );
    await expect(readFile(join(destination, 'frontend', 'navet-ha-shell.js'), 'utf8')).resolves.toBe(
      'fresh shell\n'
    );
    await expect(readFile(join(destination, 'frontend', 'assets', 'app.js'), 'utf8')).resolves.toBe(
      'fresh chunk\n'
    );
  });

  it('keeps tagged panel artifacts build-owned instead of checkout-owned', async () => {
    const repositoryRoot = resolve(import.meta.dirname, '..');
    const workflow = parse(
      await readFile(join(repositoryRoot, '.github/workflows/release.yml'), 'utf8')
    );
    const steps = workflow.jobs['custom-panel-artifact'].steps;
    const buildIndex = steps.findIndex((step) => step.name === 'Build custom panel');
    const packageIndex = steps.findIndex((step) => step.name === 'Package custom panel artifact');

    expect(buildIndex).toBeGreaterThan(-1);
    expect(packageIndex).toBeGreaterThan(buildIndex);
    expect(steps[buildIndex].run).toBe('pnpm build:ha-panel');
    expect(steps[packageIndex].run).toContain('apps/ha-panel/dist');
    expect(steps[packageIndex].run).not.toContain(
      'tar -czf "release-assets/navet-panel-${GITHUB_REF_NAME}.tar.gz" platform/home-assistant/custom_components/navet/frontend'
    );

    const buildScript = await readFile(join(repositoryRoot, 'scripts/build-ha-panel.mjs'), 'utf8');
    expect(buildScript).not.toContain('platformNavetFrontend');
    expect(buildScript).toContain('appPaths.haPanelDist');
  });
});
