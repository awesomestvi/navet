import { createHash } from 'node:crypto';

export const normalizeNotes = (value) => {
  if (typeof value !== 'string' || !value.trim())
    throw new Error('Release notes must not be empty.');
  return value.replace(/\r\n/g, '\n').trim();
};
export const notesDigest = (value) =>
  `sha256:${createHash('sha256').update(normalizeNotes(value)).digest('hex')}`;
export function assertNotes(actual, expected, label) {
  if (notesDigest(actual) !== notesDigest(expected))
    throw new Error(`${label}: published release notes differ from the pinned release notes.`);
}

// Category headings are also level two. Numbered versions and the development-only
// In Progress section delimit published releases.
export function changelogNotes(changelog, version) {
  const headings = [
    ...changelog
      .replace(/\r\n/g, '\n')
      .matchAll(
        /^## (?:(\d+\.\d+\.\d+(?:-[\w.]+)?)(?: \([^\n]+\))?|In Progress)\s*$/gm,
      ),
  ];
  const matches = headings.filter((heading) => heading[1] === version);
  if (matches.length > 1) throw new Error(`Duplicate changelog entries for ${version}.`);
  if (matches.length === 0) return null;
  const heading = matches[0];
  const next = headings[headings.indexOf(heading) + 1];
  return changelog
    .replace(/\r\n/g, '\n')
    .slice(heading.index + heading[0].length, next?.index)
    .trim();
}

export function validateNotesBundle(bundle, { tag, sha } = {}) {
  if (
    bundle?.schema !== 1 ||
    !/^v\d+\.\d+\.\d+(?:-(?:beta|rc)\.\d+)?$/.test(bundle.tag) ||
    !/^[a-f0-9]{40}$/.test(bundle.sha) ||
    !/^[a-f0-9]{40}$/.test(bundle.baseSha) ||
    (tag && bundle.tag !== tag) ||
    (sha && bundle.sha !== sha)
  )
    throw new Error('Release notes provenance mismatch.');
  for (const audience of ['general', 'hacs', 'homeAssistant']) {
    if (notesDigest(bundle.notes?.[audience]) !== bundle.digests?.[audience])
      throw new Error(`Invalid ${audience} release notes digest.`);
  }
  return bundle;
}

export function assertReleaseNotes(release, { tag, prerelease, notes }) {
  if (release.tag_name !== tag || release.draft || release.prerelease !== prerelease)
    throw new Error(`Invalid publication state for ${tag}.`);
  assertNotes(release.body, notes, tag);
}

export function assertAddonNotes(config, changelog, bundle) {
  const version = bundle.tag.slice(1);
  if (config.match(/^version:\s*["']?([^"'\s]+)["']?\s*$/m)?.[1] !== version)
    throw new Error('Published Home Assistant App version differs.');
  assertNotes(
    changelogNotes(changelog, version),
    bundle.notes.homeAssistant,
    'Home Assistant App changelog',
  );
}
