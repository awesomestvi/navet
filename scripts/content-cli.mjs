#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process, { stdin as input, stdout as output } from 'node:process';
import readline from 'node:readline/promises';
import {
  CONTENT_KINDS,
  checkContentPack,
  contentRoot,
  createPublishedRecord,
  generateContentPack,
  loadPack,
  parseCliArgs,
  repoRoot,
  validateFinalCopy,
  validateMetrics,
  validatePublishedAsset,
  writeYaml,
} from './content-workflow.mjs';

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(repoRoot, filePath), 'utf8'));
}

function assertInside(parent, target, message) {
  const relativePath = path.relative(parent, target);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) throw new Error(message);
}

async function createBrief(options) {
  const prompt = readline.createInterface({ input, output });
  try {
    const today = new Date().toISOString().slice(0, 10);
    const kind =
      options.kind ||
      (await prompt.question(
        'Content kind (feature, release, how-to, tip, behind-the-scenes): '
      ));
    if (!CONTENT_KINDS.has(kind)) throw new Error(`Unsupported content kind "${kind}".`);
    const title = options.title || (await prompt.question('Working title: '));
    const id = options.id || `${today}-${slugify(title)}`;
    const ask = (question) => prompt.question(question);
    const brief = {
      schemaVersion: 1,
      id,
      createdOn: today,
      kind,
      title,
      oneIdea: await ask('One idea this piece should communicate: '),
      audience: await ask('Who is this for? '),
      maintainerSeed: {
        problem: await ask('What changed or what problem are you solving? '),
        whyItMatters: await ask('Why does this matter to you personally? '),
        specificDetail: await ask('What specific detail or tradeoff is worth sharing? '),
        limitation: await ask('What limitation must be clear? '),
        desiredConversation: await ask('What useful action should follow? '),
      },
      providerScope: ['provider-neutral'],
      evidence: [
        {
          id: 'replace-with-evidence-id',
          source: 'CHANGELOG.md',
          locator: 'PENDING: Add an exact source locator.',
          claim: 'PENDING: Add the verified claim.',
          verifiedOn: today,
        },
      ],
      canonicalDocs: {
        path: kind === 'how-to' ? `docs/guide/how-to/${slugify(title)}.md` : '',
        status: kind === 'how-to' ? 'planned' : 'not-applicable',
        angle: '',
      },
      cta: { label: 'Explore the Navet demo', url: 'https://demo.navet.app/' },
      asset: {
        kind: 'screenshot',
        scenario: 'navet-ipad-landscape-home',
        sourcePolicy: 'provider-free-demo-only',
        altText: 'PENDING: Describe the product state shown in the capture.',
      },
      channels: ['navet-subreddit', 'navet-discord'],
      publishing: {
        cadence: 'weekly-anchor',
        externalCommunity: false,
        humanApprovalRequired: true,
      },
    };
    const outputPath = path.join(contentRoot, 'briefs', `${id}.yml`);
    if (fs.existsSync(outputPath)) {
      throw new Error(`${path.relative(repoRoot, outputPath)} already exists.`);
    }
    writeYaml(outputPath, brief);
    console.log(`Created ${path.relative(repoRoot, outputPath)}.`);
  } finally {
    prompt.close();
  }
}

async function generate(options) {
  if (!options.brief || options.brief === true) {
    throw new Error('Usage: pnpm marketing:content:generate -- --brief <brief.yml> [--output <dir>]');
  }
  const result = await generateContentPack({
    briefPath: options.brief,
    outputPath: options.output === true ? undefined : options.output,
  });
  console.log(`Generated content pack at ${path.relative(repoRoot, result.outputPath)}.`);
  console.log(`Publish eligible after human review: ${result.pack.publishEligible ? 'yes' : 'no'}.`);
}

function check(options) {
  if (!options.pack || options.pack === true) {
    throw new Error('Usage: pnpm marketing:content:check -- --pack <pack-directory>');
  }
  const result = checkContentPack(loadPack(options.pack).pack);
  for (const warning of result.warnings) console.warn(`warning: ${warning}`);
  if (result.errors.length > 0) throw new Error(result.errors.map((error) => `- ${error}`).join('\n'));
  console.log('Content pack checks passed. Human review and manual publication remain required.');
}

function record(options) {
  if (options['update-record']) {
    if (!options['metrics-file'] || options['metrics-file'] === true) {
      throw new Error('--update-record requires --metrics-file.');
    }
    const recordPath = path.resolve(repoRoot, options['update-record']);
    assertInside(
      path.join(contentRoot, 'published'),
      recordPath,
      'Published records must stay inside marketing/content/published/.'
    );
    const recordValue = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
    const metrics = readJson(options['metrics-file']);
    const errors = validateMetrics(metrics);
    if (errors.length > 0) throw new Error(`Metrics failed validation:\n- ${errors.join('\n- ')}`);
    recordValue.metrics = metrics;
    recordValue.metricsUpdatedAt = new Date().toISOString();
    fs.writeFileSync(recordPath, `${JSON.stringify(recordValue, null, 2)}\n`);
    console.log(`Updated aggregate results in ${path.relative(repoRoot, recordPath)}.`);
    return;
  }

  const required = ['pack', 'channel', 'url', 'final-copy', 'confirm-human-reviewed'];
  const missing = required.filter((key) => !options[key]);
  if (missing.length > 0) throw new Error(`Missing required option(s): ${missing.join(', ')}.`);
  const { pack } = loadPack(options.pack);
  if (!pack.publishEligible) throw new Error('The content pack is not publish-eligible.');
  const finalCopy = fs.readFileSync(path.resolve(repoRoot, options['final-copy']), 'utf8').trim();
  const generatedDraft = pack.drafts.find((entry) => entry.channelId === options.channel);
  if (finalCopy === (generatedDraft?.script || generatedDraft?.body || '').trim()) {
    throw new Error('Final copy is unchanged from the generated draft; complete the human edit first.');
  }
  const finalCopyErrors = validateFinalCopy({
    body: finalCopy,
    channelId: options.channel,
    pack,
    publicUrl: options.url,
  }).errors;
  if (finalCopyErrors.length > 0) {
    throw new Error(`Final copy failed validation:\n- ${finalCopyErrors.join('\n- ')}`);
  }
  const metrics = options['metrics-file'] ? readJson(options['metrics-file']) : undefined;
  const metricErrors = metrics ? validateMetrics(metrics) : [];
  if (metricErrors.length > 0) {
    throw new Error(`Metrics failed validation:\n- ${metricErrors.join('\n- ')}`);
  }
  const asset = options['asset-metadata'] ? readJson(options['asset-metadata']) : undefined;
  const assetErrors = validatePublishedAsset(asset);
  if (assetErrors.length > 0) {
    throw new Error(`Published asset failed validation:\n- ${assetErrors.join('\n- ')}`);
  }
  const publishedAt = options['published-at'] || new Date().toISOString();
  if (Number.isNaN(new Date(publishedAt).valueOf())) throw new Error('--published-at is invalid.');
  const publishedRecord = createPublishedRecord({
    pack,
    channelId: options.channel,
    publicUrl: options.url,
    finalCopy,
    publishedAt,
    metrics,
    asset,
  });
  const outputDirectory = path.join(contentRoot, 'published', pack.id);
  const outputPath = path.join(outputDirectory, `${options.channel}.json`);
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(publishedRecord, null, 2)}\n`);
  console.log(`Recorded human-reviewed publication at ${path.relative(repoRoot, outputPath)}.`);
}

const [command, ...arguments_] = process.argv.slice(2);
const options = parseCliArgs(arguments_);

try {
  if (command === 'new') await createBrief(options);
  else if (command === 'generate') await generate(options);
  else if (command === 'check') check(options);
  else if (command === 'record') record(options);
  else throw new Error('Use one of: new, generate, check, record.');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
