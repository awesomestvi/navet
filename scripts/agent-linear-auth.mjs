import { constants } from 'node:fs';
import { lstat, open } from 'node:fs/promises';
import path from 'node:path';
import { readLinearResponseJson } from './agent-linear-reader.mjs';

function secretText(value, max) {
  return typeof value === 'string' && value.trim() && value.length <= max && !/[\r\n]/.test(value);
}

// Prefer a credential manager through the same callback interface when available. This file
// fallback requires an owner-private directory and a regular, singly linked owner-private file.
// Never pass the returned credentials in command arguments or print them.
export async function readLinearClientCredentials(file) {
  let handle;
  try {
    const directory = await lstat(path.dirname(path.resolve(file)));
    const uid = process.getuid?.();
    if (uid === undefined || !Number.isInteger(constants.O_NOFOLLOW) || !directory.isDirectory() || (directory.mode & 0o077) !== 0 ||
        (uid !== undefined && directory.uid !== uid)) throw new Error('Invalid credential directory.');
    handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = await handle.stat();
    if (!before.isFile() || before.nlink !== 1 || (before.mode & 0o077) !== 0 || before.size > 16_384 ||
        (uid !== undefined && before.uid !== uid)) throw new Error('Invalid credential file.');
    const buffer = Buffer.alloc(16_385);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const after = await handle.stat();
    if (bytesRead > 16_384 || bytesRead !== before.size || before.size !== after.size ||
        before.mtimeMs !== after.mtimeMs) throw new Error('Credential file changed during reading.');
    const credentials = JSON.parse(buffer.subarray(0, bytesRead).toString('utf8'));
    if (!credentials || Object.keys(credentials).length !== 2 ||
        !secretText(credentials.clientId, 256) || !secretText(credentials.clientSecret, 8192)) {
      throw new Error('Incomplete credentials.');
    }
    return credentials;
  } catch {
    throw new Error('Private Linear client credentials are unavailable or invalid.');
  } finally {
    await handle?.close();
  }
}

// Obtain one read-only app token for one coordinator run. No token is written to disk or
// returned as session metadata. The reader still verifies its app identity through Linear.
export async function createLinearReadSession({ readCredentials, fetchImpl = globalThis.fetch,
  now = () => Date.now(), signal, timeoutMs = 20_000 }) {
  if (typeof readCredentials !== 'function' || typeof fetchImpl !== 'function' || typeof now !== 'function' ||
      !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000) {
    throw new Error('Linear read session requires credential storage and bounded transport.');
  }
  const controller = new AbortController();
  const cancel = () => controller.abort();
  let rejectAbort;
  const aborted = new Promise((_, reject) => { rejectAbort = reject; });
  const onAbort = () => rejectAbort(new Error('Linear authentication canceled.'));
  controller.signal.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(cancel, timeoutMs);
  signal?.addEventListener('abort', cancel, { once: true });
  const bounded = (operation) => Promise.race([operation, aborted]);
  try {
    // Observe a pre-aborted signal through the same bounded path, without creating an
    // unhandled rejection before Promise.race has attached its rejection handler.
    if (signal?.aborted) throw new Error('Canceled.');
    const startedAt = now();
    if (!Number.isSafeInteger(startedAt) || startedAt <= 0) throw new Error('Invalid clock.');
    const credentials = await bounded(readCredentials({ signal: controller.signal }));
    if (!secretText(credentials?.clientId, 256) || !secretText(credentials?.clientSecret, 8192)) {
      throw new Error('Incomplete credentials.');
    }
    const response = await bounded(fetchImpl('https://api.linear.app/oauth/token', {
      method: 'POST', redirect: 'error', cache: 'no-store', signal: controller.signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'read',
        client_id: credentials.clientId, client_secret: credentials.clientSecret }).toString(),
    }));
    const result = await readLinearResponseJson(response, bounded, 16_384);
    const scopes = Array.isArray(result?.scope) ? result.scope : typeof result?.scope === 'string' ? result.scope.trim().split(/[\s,]+/) : [];
    if (!secretText(result?.access_token, 8192) || result.token_type?.toLowerCase() !== 'bearer' ||
        !Number.isSafeInteger(result.expires_in) || result.expires_in <= 30 ||
        scopes.length !== 1 || scopes[0] !== 'read' || result.refresh_token !== undefined) {
      throw new Error('Invalid read-only client credentials response.');
    }
    const finishedAt = now();
    const expiresAt = startedAt + result.expires_in * 1000;
    if (!Number.isSafeInteger(finishedAt) || finishedAt < startedAt || finishedAt - startedAt > timeoutMs ||
        !Number.isSafeInteger(expiresAt)) throw new Error('Invalid token lifetime.');
    let token = result.access_token;
    return {
      expiresAt,
      getAccessToken: async ({ signal: readSignal } = {}) => {
        const observedAt = now();
        if (signal?.aborted || !Number.isSafeInteger(observedAt) || observedAt < startedAt || observedAt >= expiresAt - 30_000) token = null;
        if (!token || readSignal?.aborted) throw new Error('Linear read session is closed or expired.');
        return token;
      },
      close: () => { token = null; },
    };
  } catch {
    throw new Error('Linear read-only app authentication failed.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
    controller.signal.removeEventListener('abort', onAbort);
    controller.abort();
  }
}
