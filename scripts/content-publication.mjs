import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  checkContentPack,
  CONTENT_KINDS,
  communityPublishedRoot,
  loadChannelConfig,
  repoRoot,
  validatePublishedAsset,
  verifyReleaseSource,
} from './content-workflow.mjs';

const OWNED_CHANNELS = new Set(['navet-subreddit', 'navet-discord', 'homeassistant-community']);
const REVIEW_CHECKS = [
  'facts',
  'providerScope',
  'voice',
  'visualIdentity',
  'feedReadability',
  'accessibility',
  'links',
];
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (message) => {
  throw new Error(message);
};

export function publicationContentHash({ title, body }) {
  return hash(JSON.stringify({ title, body }));
}

export function publicationMasterPost({ title, body }) {
  return { title, body: body.startsWith(`${title}\n\n`) ? body.slice(title.length + 2) : body };
}

function fresh(value, now, label) {
  const time = Date.parse(value);
  if (!Number.isFinite(time) || time > now.valueOf() || now.valueOf() - time > 86400000) {
    fail(`${label} must be an observed timestamp within the last 24 hours.`);
  }
}

function observedTime(value, now, label) {
  if (!Number.isFinite(Date.parse(value)) || Date.parse(value) > now.valueOf())
    fail(`${label} requires a valid observed timestamp.`);
}

function requireFinalApproval(authorization, snapshot, now) {
  const approval = authorization?.approval;
  const posts = approval?.posts;
  const approved = Array.isArray(posts)
    ? posts.find((post) => post.channelId === snapshot.channelId)
    : undefined;
  if (
    approval?.source !== 'codex-user' ||
    !text(approval?.reference) ||
    !approved ||
    posts.filter((post) => post.channelId === snapshot.channelId).length !== 1 ||
    approved.contentHash !== snapshot.contentHash ||
    approved.assetSha256 !== snapshot.asset.sha256 ||
    approved.assetAltText !== snapshot.asset.altText ||
    approved.destinationUrl !== snapshot.destinationUrl
  ) {
    fail(
      'Maintainer approval must match the exact final post, screenshot, alt text and destination.'
    );
  }
  if (snapshot.sharedPost) {
    const master = approval.masterPost;
    if (!master || publicationContentHash(master) !== publicationContentHash(publicationMasterPost(snapshot)) ||
        master.assetSha256 !== snapshot.asset.sha256 || master.assetAltText !== snapshot.asset.altText ||
        authorization.channels.some(channel => !posts.some(post => post.channelId === channel)))
      fail('Single-post approval must bind the master text, image and every requested destination.');
  }
  observedTime(approval.approvedAt, now, 'Final content approval');
}

function destination(channelId, value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail('Invalid publication destination.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    fail('Publication destination must be a plain HTTPS URL.');
  }
  const configured = new URL(loadChannelConfig().channels[channelId].destinationUrl);
  if (url.hostname !== configured.hostname)
    fail('Publication destination does not match the channel.');
  if (channelId === 'navet-subreddit') {
    if (url.pathname.replace(/\/$/, '') !== '/r/navet')
      fail('Publication destination must be r/navet.');
  } else if (channelId === 'homeassistant-community') {
    if (url.pathname.replace(/\/$/, '') !== configured.pathname.replace(/\/$/, ''))
      fail('Home Assistant publication requires the configured existing Navet topic.');
  } else if (!new RegExp(`^${configured.pathname}/[0-9]+/?$`).test(url.pathname)) {
    fail('Discord requires an exact channel in the configured Navet server.');
  }
  return url.href.replace(/\/$/, '');
}

function publicPostUrl(channelId, destinationUrl, value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail('Invalid published post URL.');
  }
  const target = new URL(destinationUrl);
  const validPath =
    channelId === 'navet-subreddit'
      ? /^\/r\/navet\/comments\/[a-z0-9]+(?:\/[^/]*)?\/?$/i.test(url.pathname)
      : new RegExp(`^${target.pathname}/[0-9]+/?$`).test(url.pathname);
  if (
    url.protocol !== 'https:' ||
    url.hostname !== target.hostname ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !validPath
  )
    fail('Published URL must identify a post in the exact destination.');
}

function intentFiles(intentPath, root) {
  const absolute = path.resolve(repoRoot, intentPath);
  const relative = path.relative(path.resolve(root), absolute);
  if (
    relative.startsWith('..') ||
    path.isAbsolute(relative) ||
    !absolute.endsWith('.intent.json')
  ) {
    fail('Publication intents must stay in the local publications workspace.');
  }
  // Reject symlinked parents as well as the final file before reading or writing receipts.
  let current = absolute;
  const boundary = path.resolve(root);
  while (true) {
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink())
      fail('Publication paths cannot use symlinks.');
    if (current === boundary) break;
    current = path.dirname(current);
  }
  return {
    intentPath: absolute,
    attemptPath: absolute.replace('.intent.json', '.attempt.json'),
    recordPath: absolute.replace('.intent.json', '.json'),
  };
}

const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
function writeOnce(file, value) {
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  const descriptor = fs.openSync(temporary, 'wx', 0o600);
  try {
    fs.writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`);
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  try {
    fs.linkSync(temporary, file);
  } finally {
    fs.unlinkSync(temporary);
  }
}

function retainedStatus(files, intent) {
  if (!fs.existsSync(files.recordPath)) {
    return fs.existsSync(files.attemptPath) ? 'reconcile-required' : 'prepared';
  }
  try {
    const record = read(files.recordPath);
    const receipt = record.receipt;
    if (
      record.schemaVersion !== 2 ||
      !['agent-browser', 'agent-discord-webhook'].includes(record.publicationMethod) ||
      record.humanReviewed !== Boolean(intent.authorization.approval) ||
      record.publishedManually !== false ||
      record.channelId !== intent.channelId ||
      record.release?.sourceHead !== intent.release.sourceHead ||
      record.contentHash !== intent.contentHash ||
      record.finalTitle !== intent.title ||
      record.finalCopy !== intent.body ||
      record.asset?.sha256 !== intent.asset.sha256 ||
      receipt?.account !== intent.account ||
      receipt?.destinationUrl !== intent.destinationUrl ||
      receipt?.title !== intent.title ||
      receipt?.body !== intent.body ||
      receipt?.assetSha256 !== intent.asset.sha256 ||
      record.publicUrl !== receipt?.publicUrl ||
      !text(receipt?.evidence) ||
      !Number.isFinite(Date.parse(receipt?.observedAt))
    )
      return 'reconcile-required';
    publicPostUrl(intent.channelId, intent.destinationUrl, receipt.publicUrl);
    return 'published';
  } catch {
    return 'reconcile-required';
  }
}

// These functions validate retained observations. The skill must obtain request authority from
// the human conversation and independent account/content readback from the owning browser.
export function preparePublication({
  pack,
  channelId,
  authorization,
  review,
  asset,
  root = communityPublishedRoot,
  now = new Date(),
}) {
  if (!OWNED_CHANNELS.has(channelId))
    fail('Agent publication supports only Navet Reddit and Discord, plus the configured Home Assistant topic.');
  const errors = checkContentPack(pack, { now }).errors;
  if (errors.length) fail(`Content checks failed: ${errors.join(' ')}`);
  const draft = pack.drafts.find((entry) => entry.channelId === channelId);
  if (!draft || !text(draft.body) || draft.script) fail('Publication requires a final text draft.');
  if (!draft.body.includes(draft.cta?.url) || !text(draft.cta?.url))
    fail('Final body must include its reviewed CTA URL.');
  if (channelId === 'navet-discord' && !draft.body.startsWith(`${draft.title}\n\n`)) {
    fail('Discord body must start with its title followed by a blank line.');
  }
  const release = authorization?.release ?? authorization?.sourceSnapshot;
  const community = authorization?.action === 'publish-community';
  if (
    (!community && authorization?.action !== 'publish-release') ||
    authorization?.source !== 'codex-user' ||
    !text(authorization?.requestId) ||
    !text(authorization?.requestReference) ||
    !Array.isArray(authorization?.channels) ||
    !authorization.channels.includes(channelId) ||
    authorization.channels.some((id) => !OWNED_CHANNELS.has(id))
  ) {
    fail('Publication requires an explicit human request for the owned channels.');
  }
  if ((!community || pack.brief.kind === 'release') && (
    !/^v?\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(release?.tag ?? '') ||
    !/^[a-f0-9]{40}$/.test(release?.sourceHead ?? '') ||
    release?.url !== `https://github.com/awesomestvi/navet/releases/tag/${release.tag}` ||
    !Number.isFinite(Date.parse(release?.publishedAt)) ||
    Date.parse(release.publishedAt) > now.valueOf()
  )) {
    fail('Publication requires an observed published Navet release and its exact source head.');
  }
  if (!community && pack.brief.kind !== 'release') fail('Agent publication requires a release brief.');
  if (community && (!pack.brief.sharedPost || !CONTENT_KINDS.has(pack.brief.kind) ||
      !/^[a-f0-9]{40}$/.test(release?.sourceHead ?? '')))
    fail('Community publication requires a shared post and an exact verified source head.');
  if (community && pack.brief.kind === 'release' && (!release.tag || !release.url || !release.publishedAt))
    fail('Release posts require published release provenance.');
  const sourceFiles = [
    ...new Set([
      ...(pack.brief.evidence ?? []).map((entry) => entry.source),
      'scripts/capture-marketing-media.mjs',
      ...(pack.brief.asset?.fixtureSource ? [pack.brief.asset.fixtureSource] : []),
    ]),
  ];
  verifyReleaseSource(pack.sourceRoot, release, sourceFiles, pack.brief.kind === 'release');
  observedTime(authorization.requestedAt, now, 'Request authorization');
  const contentHash = publicationContentHash(draft);
  const assetErrors = validatePublishedAsset({
    ...asset,
    publicUrl: asset?.publicUrl ?? 'https://navet.app/',
  });
  if (
    !asset ||
    assetErrors.length ||
    asset.kind !== 'image' ||
    !asset.width ||
    !asset.height ||
    asset.altText !== draft.assetAltText
  )
    fail(
      `A reviewed screenshot with matching alt text and dimensions is required. ${assetErrors.join(' ')}`
    );
  if (
    review?.channelId !== channelId ||
    review?.contentHash !== contentHash ||
    review?.assetSha256 !== asset.sha256 ||
    review?.sourceHead !== release.sourceHead ||
    !text(review?.reviewer) ||
    !text(review?.account) ||
    REVIEW_CHECKS.some((key) => !text(review?.evidence?.[key]))
  ) {
    fail(
      'Quality review must bind the final content, screenshot, account and release head with evidence for every check.'
    );
  }
  observedTime(review.reviewedAt, now, 'Quality review');
  const destinationUrl = destination(channelId, review.destinationUrl);
  requireFinalApproval(authorization, { channelId, contentHash, asset, destinationUrl, title: draft.title, body: draft.body, sharedPost: community }, now);
  const files = intentFiles(
    path.join(root, community ? `post-${pack.brief.id}` : `release-${release.tag}`, `${channelId}.intent.json`),
    root
  );
  fs.mkdirSync(path.dirname(files.intentPath), { recursive: true, mode: 0o700 });
  const intent = {
    schemaVersion: 2,
    sharedPost: community,
    publicationKind: pack.brief.kind,
    release,
    sourceRoot: pack.sourceRoot,
    sourceFiles,
    channelId,
    destinationUrl,
    account: review.account,
    title: draft.title,
    body: draft.body,
    contentHash,
    asset,
    authorization,
    review,
    evidenceIds: draft.evidenceIds,
    createdAt: now.toISOString(),
  };
  try {
    writeOnce(files.intentPath, intent);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const prior = read(files.intentPath);
    if (
      prior.contentHash !== contentHash ||
      prior.asset.sha256 !== asset.sha256 ||
      prior.destinationUrl !== destinationUrl ||
      prior.account !== review.account ||
      prior.release.sourceHead !== release.sourceHead
    ) {
      fail(
        'This release/channel already has a different retained intent; reconcile it before changing content.'
      );
    }
  }
  return { ...files, status: retainedStatus(files, read(files.intentPath)) };
}

export function attemptPublication({
  intentPath,
  root = communityPublishedRoot,
  now = new Date(),
}) {
  const files = intentFiles(intentPath, root);
  const intent = read(files.intentPath);
  const status = retainedStatus(files, intent);
  if (status !== 'prepared')
    return { status, recordPath: files.recordPath, attemptPath: files.attemptPath };
  requireFinalApproval(intent.authorization, intent, now);
  observedTime(intent.authorization.requestedAt, now, 'Request authorization');
  observedTime(intent.review.reviewedAt, now, 'Quality review');
  verifyReleaseSource(intent.sourceRoot, intent.release, intent.sourceFiles, !intent.publicationKind || intent.publicationKind === 'release');
  const attempt = {
    schemaVersion: 2,
    contentHash: intent.contentHash,
    assetSha256: intent.asset.sha256,
    attemptedAt: now.toISOString(),
  };
  try {
    writeOnce(files.attemptPath, attempt);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    return { status: 'reconcile-required', attemptPath: files.attemptPath };
  }
  return { status: 'send-once', attemptPath: files.attemptPath };
}

export function recordAgentPublication({
  intentPath,
  receipt,
  root = communityPublishedRoot,
  now = new Date(),
  method = 'agent-browser',
}) {
  const files = intentFiles(intentPath, root);
  const intent = read(files.intentPath);
  if (!['agent-browser', 'agent-discord-webhook'].includes(method) ||
      (method === 'agent-discord-webhook' && intent.channelId !== 'navet-discord'))
    fail('Unsupported publication method for this channel.');
  if (!fs.existsSync(files.attemptPath))
    fail('No retained send attempt; cannot record an agent publication.');
  if (
    receipt?.account !== intent.account ||
    receipt?.destinationUrl !== intent.destinationUrl ||
    receipt?.title !== intent.title ||
    receipt?.body !== intent.body ||
    receipt?.assetSha256 !== intent.asset.sha256 ||
    !text(receipt?.evidence)
  ) {
    fail(
      'Browser readback must match the exact account, destination, final content and screenshot.'
    );
  }
  publicPostUrl(intent.channelId, intent.destinationUrl, receipt.publicUrl);
  fresh(receipt.observedAt, now, 'Publication readback');
  if (Date.parse(receipt.observedAt) < Date.parse(read(files.attemptPath).attemptedAt)) {
    fail('Publication readback predates its send attempt.');
  }
  const record = {
    schemaVersion: 2,
    channelId: intent.channelId,
    release: intent.release,
    publicUrl: receipt.publicUrl,
    recordedAt: now.toISOString(),
    finalTitle: intent.title,
    finalCopy: intent.body,
    contentHash: intent.contentHash,
    asset: intent.asset,
    evidenceIds: intent.evidenceIds,
    authorization: intent.authorization,
    review: intent.review,
    publicationMethod: method,
    receipt,
    humanReviewed: Boolean(intent.authorization.approval),
    publishedManually: false,
  };
  try {
    writeOnce(files.recordPath, record);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const prior = read(files.recordPath);
    if (
      retainedStatus(files, intent) !== 'published' ||
      prior.contentHash !== record.contentHash ||
      prior.publicUrl !== record.publicUrl
    ) {
      fail('A different publication receipt already exists for this release/channel.');
    }
    return { status: 'already-recorded', recordPath: files.recordPath };
  }
  return { status: 'recorded', recordPath: files.recordPath };
}
