import fs from 'node:fs';
import process from 'node:process';

const messageFile = process.argv[2];

if (!messageFile) {
  console.error('Missing commit message file path.');
  process.exit(1);
}

const message = fs.readFileSync(messageFile, 'utf8');
const lines = message.replace(/\r\n/g, '\n').split('\n');
const firstLine = lines[0]?.trim() ?? '';

if (firstLine.length === 0) {
  console.error('Commit message is empty.');
  process.exit(1);
}

const conventionalCommitPattern =
  /^(?<type>[a-zA-Z0-9-]+)(?<scope>\([^)()\r\n]+\))?(?<breaking>!)?: (?<description>.+)$/;

if (!conventionalCommitPattern.test(firstLine)) {
  console.error(
    'Commit message must match Conventional Commits: `<type>[optional scope][optional !]: <description>`.'
  );
  console.error(`Received: ${firstLine}`);
  process.exit(1);
}

if (lines.length > 1 && lines[1] !== '') {
  console.error('Commit body or footers must be separated from the header by one blank line.');
  process.exit(1);
}

console.log('Commit message follows Conventional Commits.');
