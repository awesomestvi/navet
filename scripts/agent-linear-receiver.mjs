import { createServer } from 'node:http';
import { validateLinearEventPolicy } from './agent-linear-event.mjs';
import { LinearEventInputError } from './agent-linear-inbox.mjs';

const MAX_BODY_BYTES = 1_048_576;
class BodyTooLarge extends Error {}
function bodyOf(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    const chunks = [];
    request.on('data', (chunk) => {
      if (tooLarge) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        chunks.length = 0;
        reject(new BodyTooLarge());
      } else chunks.push(chunk);
    });
    request.on('end', () => { if (!tooLarge) resolve(Buffer.concat(chunks)); });
    request.on('error', reject);
    request.on('aborted', () => reject(new Error('Request aborted.')));
  });
}

export async function startLinearEventReceiver({ inbox, secret, policy, port = 0 }) {
  if (!inbox || typeof inbox.accept !== 'function' || typeof secret !== 'string' || !secret.trim() ||
      !Number.isSafeInteger(port) || port < 0 || port > 65535) throw new Error('Invalid local Linear receiver configuration.');
  policy = validateLinearEventPolicy(policy);
  const server = createServer(async (request, response) => {
    const reply = (status, body) => {
      response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(body));
    };
    if (request.url !== '/linear/webhook') { request.resume(); reply(404, { accepted: false }); return; }
    if (request.method !== 'POST') { request.resume(); reply(405, { accepted: false }); return; }
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] ?? '')) {
      request.resume(); reply(415, { accepted: false }); return;
    }
    if (Number(request.headers['content-length']) > MAX_BODY_BYTES) {
      request.resume(); reply(413, { accepted: false }); return;
    }
    try {
      const rawBody = await bodyOf(request);
      const result = await inbox.accept({ rawBody, signature: request.headers['linear-signature'], secret, policy });
      // Acknowledge only after the private transaction has durably saved the receipt.
      reply(200, { accepted: true, decision: result.decision });
    } catch (error) {
      reply(error instanceof BodyTooLarge ? 413 : error instanceof LinearEventInputError ? 400 : 503, { accepted: false });
    }
  });
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  server.keepAliveTimeout = 1000;
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
  });
  return {
    url: `http://127.0.0.1:${server.address().port}/linear/webhook`,
    stop: () => new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    }),
  };
}
