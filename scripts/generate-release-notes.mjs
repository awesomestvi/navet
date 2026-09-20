import process from 'node:process';
import {
  listAddedReleaseFragmentFiles,
  readReleaseFragments,
  renderReleaseNotes,
} from './release-fragments.mjs';

const args = process.argv.slice(2);

function valueFor(flag, fallback = null) {
  const index = args.indexOf(flag);
  return index === -1 ? fallback : args[index + 1];
}

try {
  const from = valueFor('--from');
  const to = valueFor('--to', 'HEAD');
  const audience = valueFor('--audience');
  if (!from) throw new Error('Missing --from Git ref.');
  if (!to) throw new Error('Missing --to Git ref.');

  const files = listAddedReleaseFragmentFiles(from, to);
  const fragments = readReleaseFragments(files);
  process.stdout.write(renderReleaseNotes(fragments, { audience }));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
