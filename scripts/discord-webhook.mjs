import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { attemptPublication, recordAgentPublication, publicationContentHash } from './content-publication.mjs';

// Never print webhook URLs, tokens, response bodies or raw network errors.
export function webhookEndpoint(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Invalid Discord webhook URL.'); }
  if (url.origin !== 'https://discord.com' || url.username || url.password ||
      url.search || url.hash || !/^\/api\/webhooks\/[0-9]+\/[A-Za-z0-9_-]+$/.test(url.pathname))
    throw new Error('Expected a Discord incoming webhook URL.');
  return url.href;
}

export function loadWebhookSecret(file) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077))
    throw new Error('Webhook secret must be a regular file with permissions 600.');
  return webhookEndpoint(fs.readFileSync(file, 'utf8').trim());
}

async function requestJson(fetchImpl, url, options = {}) {
  try {
    const response = await fetchImpl(url, {
      ...options, redirect: 'error', signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error();
    return await response.json();
  } catch {
    throw new Error('Discord request failed. If a send was attempted, reconcile it before retrying.');
  }
}

export async function publishDiscordWebhook({
  intentPath, assetPath, webhookUrl, root, fetchImpl = fetch, now = new Date(),
}) {
  const endpoint = webhookEndpoint(webhookUrl);
  const intent = JSON.parse(fs.readFileSync(intentPath, 'utf8'));
  if (intent.channelId !== 'navet-discord') throw new Error('A Discord publication intent is required.');
  if (publicationContentHash(intent) !== intent.contentHash ||
      !intent.body.startsWith(`${intent.title}\n\n`))
    throw new Error('Intent text does not match its approved content hash.');
  const target = new URL(intent.destinationUrl);
  const match = /^\/channels\/([0-9]+)\/([0-9]+)$/.exec(target.pathname);
  if (target.origin !== 'https://discord.com' || !match)
    throw new Error('An exact Discord server/channel destination is required.');
  const image = fs.readFileSync(assetPath);
  if (crypto.createHash('sha256').update(image).digest('hex') !== intent.asset.sha256)
    throw new Error('Screenshot does not match the approved asset.');
  const extension = path.extname(assetPath).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp'].includes(extension))
    throw new Error('Unsupported screenshot format.');
  const webhook = await requestJson(fetchImpl, endpoint);
  if (webhook.type !== 1 || String(webhook.guild_id) !== match[1] ||
      String(webhook.channel_id) !== match[2] || webhook.name !== intent.account ||
      !Object.hasOwn(intent.review, 'webhookAvatar') ||
      webhook.avatar !== intent.review.webhookAvatar)
    throw new Error('Webhook identity or destination does not match the reviewed intent.');
  const filename = `navet-release${extension}`;
  const form = new FormData();
  form.set('payload_json', JSON.stringify({
    content: intent.body,
    allowed_mentions: { parse: [] },
    attachments: [{ id: 0, filename, description: intent.asset.altText }],
  }));
  const mimeType = extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg';
  form.set('files[0]', new Blob([image], { type: mimeType }), filename);
  // Claim immediately before sending; a timeout/error leaves the immutable attempt in place.
  const claim = attemptPublication({ intentPath, root, now });
  if (claim.status !== 'send-once') return claim;
  const sent = await requestJson(fetchImpl, `${endpoint}?wait=true`, { method: 'POST', body: form });
  if (!/^[0-9]+$/.test(String(sent.id))) throw new Error('Discord returned no message ID; reconcile the send.');
  const observed = await requestJson(fetchImpl, `${endpoint}/messages/${sent.id}`);
  const attachment = observed.attachments?.[0];
  if (String(observed.id) !== String(sent.id) || observed.content !== intent.body ||
      String(observed.channel_id) !== match[2] || String(observed.webhook_id) !== String(webhook.id) ||
      observed.author?.username !== intent.account || observed.author?.avatar !== intent.review.webhookAvatar || observed.attachments?.length !== 1 ||
      attachment?.filename !== filename || attachment?.description !== intent.asset.altText ||
      attachment?.size !== image.length)
    throw new Error('Discord readback differs from the approved message; reconcile the send.');
  return recordAgentPublication({ intentPath, root, method: 'agent-discord-webhook', receipt: {
    account: intent.account, destinationUrl: intent.destinationUrl,
    title: intent.title, body: observed.content, assetSha256: intent.asset.sha256,
    publicUrl: `${intent.destinationUrl}/${sent.id}`, observedAt: new Date().toISOString(),
    evidence: `Discord API readback of message ${sent.id}: webhook identity, channel, exact content, attachment filename, alt text and byte size matched. Source SHA-256 verified before upload; rendered appearance requires visual inspection.`,
  } });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    const option = (name) => args[args.indexOf(name) + 1];
    for (const key of ['--intent', '--asset', '--secret-file'])
      if (!args.includes(key) || !option(key) || option(key).startsWith('--'))
        throw new Error('Usage: node scripts/discord-webhook.mjs --intent <intent> --asset <image> --secret-file <private-file>');
    const result = await publishDiscordWebhook({
      intentPath: path.resolve(option('--intent')), assetPath: path.resolve(option('--asset')),
      webhookUrl: loadWebhookSecret(option('--secret-file')),
    });
    console.log(JSON.stringify(result));
  } catch (error) {
    // Filesystem errors can contain the secret path; never forward arbitrary error text.
    console.error(error.code ? 'Cannot access a required local file.' : error.message);
    process.exitCode = 1;
  }
}
