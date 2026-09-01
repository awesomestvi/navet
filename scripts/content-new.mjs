#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  CONTENT_KINDS,
  contentRoot,
  parseCliArgs,
  repoRoot,
  writeYaml,
} from './content-workflow.mjs';

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

try {
  const options = parseCliArgs(process.argv.slice(2));
  const prompt = readline.createInterface({ input, output });
  const today = new Date().toISOString().slice(0, 10);

  const kind = options.kind || (await prompt.question('Content kind (feature, release, how-to, tip, behind-the-scenes): '));
  if (!CONTENT_KINDS.has(kind)) throw new Error(`Unsupported content kind "${kind}".`);
  const title = options.title || (await prompt.question('Working title: '));
  const id = options.id || `${today}-${slugify(title)}`;
  const oneIdea = await prompt.question('One idea this piece should communicate: ');
  const audience = await prompt.question('Who is this for? ');
  const problem = await prompt.question('What changed or what problem are you solving? ');
  const whyItMatters = await prompt.question('Why does this matter to you personally? ');
  const specificDetail = await prompt.question('What specific detail, tradeoff, or surprise is worth sharing? ');
  const limitation = await prompt.question('What can Navet do today, and what limitation must be clear? ');
  const desiredConversation = await prompt.question('What useful conversation or action should follow? ');
  await prompt.close();

  const brief = {
    schemaVersion: 1,
    id,
    createdOn: today,
    kind,
    title,
    oneIdea,
    audience,
    searchIntent: kind === 'how-to' ? `How to ${title.toLowerCase()}` : '',
    maintainerSeed: { problem, whyItMatters, specificDetail, limitation, desiredConversation },
    providerScope: ['provider-neutral'],
    evidence: [
      {
        id: 'replace-with-evidence-id',
        source: 'CHANGELOG.md',
        locator: 'PENDING: Add an exact source locator.',
        claim: 'PENDING: Add the verified claim this source supports.',
        verifiedOn: today,
      },
    ],
    canonicalDocs: {
      path: kind === 'how-to' ? `docs/guide/how-to/${slugify(title)}.md` : '',
      status: kind === 'how-to' ? 'planned' : 'not-applicable',
      angle: kind === 'how-to' ? 'PENDING: Add the durable guide angle.' : '',
    },
    cta: { label: 'Explore the Navet demo', url: 'https://demo.navet.app/' },
    asset: {
      kind: 'screenshot',
      scenario: 'navet-ipad-landscape-home',
      sourcePolicy: 'provider-free-demo-only',
      altText: 'PENDING: Describe the real product state shown in the capture.',
    },
    channels: ['navet-subreddit', 'navet-discord'],
    publishing: {
      cadence: 'weekly-anchor',
      externalCommunity: false,
      humanApprovalRequired: true,
    },
  };

  const outputPath = path.join(contentRoot, 'briefs', `${id}.yml`);
  if (fs.existsSync(outputPath)) throw new Error(`${path.relative(repoRoot, outputPath)} already exists.`);
  writeYaml(outputPath, brief);
  console.log(`Created ${path.relative(repoRoot, outputPath)}.`);
  console.log('Replace evidence and asset placeholders before generating a publishable pack.');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
