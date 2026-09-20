import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true }))
  );
});

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), 'navet-addon-metadata-'));
  temporaryDirectories.push(root);
  for (const directory of ['navet', 'navet-dev']) {
    const addonRoot = resolve(root, 'platform/home-assistant/addons', directory);
    await mkdir(addonRoot, { recursive: true });
    await writeFile(
      resolve(addonRoot, 'config.yaml'),
      `name: Navet\nversion: "0.17.1"\nslug: ${directory}\nurl: https://github.com/awesomestvi/navet\n`
    );
    await writeFile(resolve(addonRoot, 'CHANGELOG.md'), '# Changelog\n\n## 0.17.1\n\n- Previous release.\n');
  }
  const notes = resolve(root, 'notes.md');
  await writeFile(notes, '## Improvements and bug fixes\n\n- Fixed setup.\n');
  return { notes, root };
}

describe('Home Assistant App release metadata', () => {
  it('prepares stable metadata and an internal PR fragment in the monorepo', async () => {
    const fixture = await createFixture();
    execFileSync(
      process.execPath,
      [
        'scripts/prepare-addon-release-metadata.mjs',
        '--root', fixture.root,
        '--channel', 'stable',
        '--version', '0.18.0',
        '--tag', 'v0.18.0',
        '--notes-file', fixture.notes,
      ],
      { cwd: resolve(import.meta.dirname, '..') }
    );

    const config = parse(
      await readFile(resolve(fixture.root, 'platform/home-assistant/addons/navet/config.yaml'), 'utf8')
    );
    expect(config.version).toBe('0.18.0');
    await expect(
      readFile(resolve(fixture.root, 'platform/home-assistant/addons/navet/CHANGELOG.md'), 'utf8')
    ).resolves.toContain('## 0.18.0\n\n## Improvements and bug fixes\n\n- Fixed setup.');
    await expect(
      readFile(resolve(fixture.root, '.changes/release-metadata-v0-18-0.yaml'), 'utf8')
    ).resolves.toContain('type: internal');
  });

  it('routes beta metadata to Navet Dev', async () => {
    const fixture = await createFixture();
    execFileSync(
      process.execPath,
      [
        'scripts/prepare-addon-release-metadata.mjs',
        '--root', fixture.root,
        '--channel', 'dev',
        '--version', '0.18.0-beta.1',
        '--tag', 'v0.18.0-beta.1',
        '--notes-file', fixture.notes,
      ],
      { cwd: resolve(import.meta.dirname, '..') }
    );

    const config = parse(
      await readFile(
        resolve(fixture.root, 'platform/home-assistant/addons/navet-dev/config.yaml'),
        'utf8'
      )
    );
    expect(config.version).toBe('0.18.0-beta.1');
  });
});
