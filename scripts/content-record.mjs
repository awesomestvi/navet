#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  contentRoot,
  createPublishedRecord,
  loadPack,
  parseCliArgs,
  repoRoot,
  validateFinalCopy,
  validateMetrics,
} from './content-workflow.mjs';

try {
  const options = parseCliArgs(process.argv.slice(2));
  if (options['update-record']) {
    if (!options['metrics-file'] || options['metrics-file'] === true) {
      throw new Error('--update-record requires --metrics-file.');
    }
    const recordPath = path.resolve(repoRoot, options['update-record']);
    const publishedRoot = path.join(contentRoot, 'published');
    const relativeRecordPath = path.relative(publishedRoot, recordPath);
    if (relativeRecordPath.startsWith('..') || path.isAbsolute(relativeRecordPath)) {
      throw new Error('Published records must stay inside marketing/content/published/.');
    }
    const record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
    const metrics = JSON.parse(
      fs.readFileSync(path.resolve(repoRoot, options['metrics-file']), 'utf8')
    );
    const metricErrors = validateMetrics(metrics);
    if (metricErrors.length > 0) {
      throw new Error(`Metrics failed validation:\n- ${metricErrors.join('\n- ')}`);
    }
    record.metrics = metrics;
    record.metricsUpdatedAt = new Date().toISOString();
    fs.writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);
    console.log(`Updated aggregate results in ${path.relative(repoRoot, recordPath)}.`);
    process.exit(0);
  }

  const required = ['pack', 'channel', 'url', 'final-copy', 'confirm-human-reviewed'];
  const missing = required.filter((key) => !options[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required option(s): ${missing.map((key) => `--${key}`).join(', ')}.`);
  }

  const { pack } = loadPack(options.pack);
  if (!pack.publishEligible) {
    throw new Error(
      'This pack is not publish-eligible. Resolve its blocking items and regenerate it before recording publication.'
    );
  }
  const copyPath = path.resolve(repoRoot, options['final-copy']);
  const finalCopy = fs.readFileSync(copyPath, 'utf8').trim();
  const generatedDraft = pack.drafts.find((entry) => entry.channelId === options.channel);
  const generatedCopy = (generatedDraft?.script || generatedDraft?.body || '').trim();
  if (finalCopy === generatedCopy) {
    throw new Error('Final copy is unchanged from the generated draft; complete the human edit first.');
  }
  const validation = validateFinalCopy({
    body: finalCopy,
    channelId: options.channel,
    pack,
    publicUrl: options.url,
  });
  if (validation.errors.length > 0) {
    throw new Error(`Final copy failed validation:\n- ${validation.errors.join('\n- ')}`);
  }

  let metrics;
  if (options['metrics-file']) {
    metrics = JSON.parse(fs.readFileSync(path.resolve(repoRoot, options['metrics-file']), 'utf8'));
    const metricErrors = validateMetrics(metrics);
    if (metricErrors.length > 0) {
      throw new Error(`Metrics failed validation:\n- ${metricErrors.join('\n- ')}`);
    }
  }
  const publishedAt = options['published-at'] || new Date().toISOString();
  if (Number.isNaN(new Date(publishedAt).valueOf())) throw new Error('--published-at is invalid.');

  const record = createPublishedRecord({
    pack,
    channelId: options.channel,
    publicUrl: options.url,
    finalCopy,
    publishedAt,
    metrics,
  });
  const outputDir = path.join(contentRoot, 'published', pack.id);
  const outputPath = path.join(outputDir, `${options.channel}.json`);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`Recorded human-reviewed publication at ${path.relative(repoRoot, outputPath)}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
