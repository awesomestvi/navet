import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { readReleaseFragments, renderReleaseNotes } from './release-fragments.mjs';
import {
  assertAddonNotes,
  assertNotes,
  assertReleaseNotes,
  changelogNotes,
  notesDigest,
  validateNotesBundle,
} from './release-note-contract.mjs';
import { renderHacsChangelog } from './hacs-changelog.mjs';

/**
 * Verifies that add-on note extraction stops at the generated development boundary.
 *
 * @param {string} _lineEndingName Human-readable case label supplied by Vitest.
 * @param {string} lineEnding Line ending used to construct the changelog fixture.
 */
function verifyDevelopmentBoundary(_lineEndingName, lineEnding) {
  const body = '## Improvements and bug fixes\n\n- Fixed badge.';
  const changelog = [
    '# Changelog',
    '',
    '## 0.17.2-beta.2',
    '',
    '## Improvements and bug fixes',
    '',
    '- Fixed badge.',
    '',
    '## In Progress',
    '',
    '- Current Navet Dev scope.',
    '',
  ].join(lineEnding);
  const bundle = { tag: 'v0.17.2-beta.2', notes: { homeAssistant: body } };

  expect(changelogNotes(changelog, '0.17.2-beta.2')).toBe(body);
  expect(() => assertAddonNotes('version: "0.17.2-beta.2"\n', changelog, bundle)).not.toThrow();
}

describe('immutable release note contract', () => {
  it('reads the selected commit even after a fragment changes or disappears locally', () => {
    const root = mkdtempSync(join(tmpdir(), 'navet-pinned-notes-'));
    const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
    try {
      git('init', '-q');
      mkdirSync(join(root, '.changes'));
      const path = join(root, '.changes/fix.yaml');
      writeFileSync(path, 'type: fixed\naudiences: [hacs]\nsummary: Fixed original badge.\n');
      git('add', '.changes');
      git(
        '-c',
        'user.name=Test',
        '-c',
        'user.email=test@example.invalid',
        '-c',
        'core.hooksPath=/dev/null',
        'commit',
        '-qm',
        'test: fixture',
      );
      const sha = git('rev-parse', 'HEAD');
      writeFileSync(path, 'type: fixed\naudiences: [hacs]\nsummary: Changed after tagging.\n');
      expect(renderReleaseNotes(readReleaseFragments(['.changes/fix.yaml'], sha, root))).toContain(
        'Fixed original badge.',
      );
      rmSync(path);
      expect(readReleaseFragments(['.changes/fix.yaml'], sha, root)[0].summary).toBe(
        'Fixed original badge.',
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects empty, changed and mismatched published notes', () => {
    expect(() => assertNotes('', 'expected', 'HACS')).toThrow();
    expect(() => assertNotes('wrong', 'expected', 'HACS')).toThrow('differ');
    expect(() => assertNotes('expected\r\n', 'expected\n', 'HACS')).not.toThrow();
    expect(() =>
      assertReleaseNotes(
        { tag_name: 'v1.0.0', draft: false, prerelease: false, body: 'wrong' },
        { tag: 'v1.0.0', prerelease: false, notes: 'expected' },
      ),
    ).toThrow();
  });

  it('verifies the add-on store version and exact version section together', () => {
    const bundle = { tag: 'v0.18.0', notes: { homeAssistant: '## Fixed\n\n- Correct note.' } };
    const changelog =
      '# Changelog\n\n## 0.18.0\n\n## Fixed\n\n- Correct note.\n\n## 0.17.1\n\n- Earlier.';
    expect(() => assertAddonNotes('version: "0.18.0"\n', changelog, bundle)).not.toThrow();
    expect(() => assertAddonNotes('version: "0.17.1"\n', changelog, bundle)).toThrow(
      'version differs',
    );
    expect(() =>
      assertAddonNotes('version: "0.18.0"\n', changelog.replace('Correct', 'Wrong'), bundle),
    ).toThrow('differ');
    expect(() => assertAddonNotes('version: "0.18.0"\n', '# Changelog', bundle)).toThrow();
  });

  it('checks provenance and all three audience digests', () => {
    const notes = { general: 'general', hacs: 'hacs', homeAssistant: 'addon' };
    const bundle = {
      schema: 1,
      tag: 'v1.0.0',
      sha: 'a'.repeat(40),
      baseSha: 'b'.repeat(40),
      notes,
      digests: Object.fromEntries(
        Object.entries(notes).map(([key, body]) => [key, notesDigest(body)]),
      ),
    };
    expect(validateNotesBundle(bundle)).toBe(bundle);
    expect(() => validateNotesBundle(bundle, { sha: 'c'.repeat(40) })).toThrow();
    expect(() =>
      validateNotesBundle({ ...bundle, notes: { ...notes, hacs: 'changed' } }),
    ).toThrow();
  });

  it('preserves version boundaries and makes HACS retries idempotent across dates', () => {
    const body = '## Improvements and bug fixes\n\n- Fixed badge.';
    const first = renderHacsChangelog({
      releaseVersion: '0.17.2',
      releaseDate: '2026-09-20',
      releaseNotes: body,
      existingChangelog: '# Changelog\n\n## 0.17.1\n\n- Earlier.',
    });
    expect(changelogNotes(first, '0.17.2')).toBe(body);
    expect(
      renderHacsChangelog({
        releaseVersion: '0.17.2',
        releaseDate: '2026-09-21',
        releaseNotes: body,
        existingChangelog: first,
      }),
    ).toBe(first);
    expect(() =>
      renderHacsChangelog({
        releaseVersion: '0.17.2',
        releaseDate: '2026-09-21',
        releaseNotes: 'wrong',
        existingChangelog: first,
      }),
    ).toThrow();
    expect(() => changelogNotes(first + '\n## 0.17.2\nwrong', '0.17.2')).toThrow('Duplicate');
  });

  it.each([
    ['LF', '\n'],
    ['CRLF', '\r\n'],
  ])('stops published notes at In Progress with %s input', verifyDevelopmentBoundary);
});
