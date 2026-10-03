import { chmod, link, mkdir, mkdtemp, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createLinearCommentSession, createLinearReadSession, readLinearClientCredentials } from './agent-linear-auth.mjs';

const directories = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});
const credentials = { clientId: 'synthetic-client-id', clientSecret: 'synthetic-private-client-secret' };
const tokenResponse = (changes = {}) => ({ access_token: 'synthetic-run-token', token_type: 'Bearer',
  expires_in: 2_591_999, scope: 'read', ...changes });

async function credentialFile(value = credentials) {
  const directory = await mkdtemp(path.join(tmpdir(), 'navet-linear-auth-'));
  directories.push(directory);
  const privateDirectory = path.join(directory, 'private');
  await mkdir(privateDirectory, { mode: 0o700 });
  const file = path.join(privateDirectory, 'client.json');
  await writeFile(file, JSON.stringify(value), { mode: 0o600 });
  return { directory, privateDirectory, file };
}

function harness(response = tokenResponse(), changes = {}) {
  let time = 1_700_000_000_000;
  const requests = [];
  const input = { now: () => time, readCredentials: async () => credentials,
    fetchImpl: async (url, init) => { requests.push({ url, ...init });
      return response instanceof Response ? response : new Response(JSON.stringify(response)); }, ...changes };
  return { input, requests, advance: (duration) => { time += duration; } };
}

describe('run-scoped Linear app authentication', () => {
  it('requests only read and comments:create for the separately configured comment app', async () => {
    const { input, requests } = harness(tokenResponse({ scope: 'comments:create read' }));
    const session = await createLinearCommentSession(input);
    expect(new URLSearchParams(requests[0].body).get('scope')).toBe('read,comments:create');
    expect(await session.getAccessToken()).toBe('synthetic-run-token');
    session.close();
    await expect(session.getAccessToken()).rejects.toThrow('closed or expired');
  });

  it.each(['read write', 'read admin', 'read', 'read read', 'read comments:create issues:create'])
    ('rejects insufficient, broader or duplicated comment grants %s', async (scope) => {
      const { input } = harness(tokenResponse({ scope }));
      await expect(createLinearCommentSession(input)).rejects.toThrow('comment app authentication failed');
    });

  it('requests only read scope from the fixed token endpoint with redirects disabled', async () => {
    const { input, requests } = harness();
    const session = await createLinearReadSession(input);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ url: 'https://api.linear.app/oauth/token', method: 'POST',
      redirect: 'error', cache: 'no-store', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    const body = new URLSearchParams(requests[0].body);
    expect(Object.fromEntries(body)).toEqual({ grant_type: 'client_credentials', scope: 'read',
      client_id: credentials.clientId, client_secret: credentials.clientSecret });
    expect(await session.getAccessToken()).toBe('synthetic-run-token');
    expect(JSON.stringify(session)).not.toMatch(/synthetic-run-token|synthetic-private-client-secret/);
    session.close();
    await expect(session.getAccessToken()).rejects.toThrow('closed or expired');
  });

  it('obtains a fresh token for each run without writing access tokens beside credentials', async () => {
    const { file, privateDirectory } = await credentialFile();
    const { input, requests } = harness(tokenResponse(), { readCredentials: () => readLinearClientCredentials(file) });
    const first = await createLinearReadSession(input);
    first.close();
    const second = await createLinearReadSession(input);
    second.close();
    expect(requests).toHaveLength(2);
    expect(await readdir(privateDirectory)).toEqual(['client.json']);
  });

  it.each([
    { scope: 'read write' }, { scope: ['read', 'write'] }, { scope: 'read,read' },
    { scope: '' }, { scope: undefined }, { token_type: 'Basic' }, { access_token: '' },
    { access_token: 'token\nprivate' }, { expires_in: 0 }, { expires_in: 30 },
    { expires_in: 1.5 }, { expires_in: Number.MAX_SAFE_INTEGER }, { refresh_token: 'unexpected' },
  ])('rejects broader permission or invalid token metadata %j', async (change) => {
    const { input } = harness(tokenResponse(change));
    await expect(createLinearReadSession(input)).rejects.toThrow('read-only app authentication failed');
  });

  it('accepts the documented legacy scope-array format when it contains only read', async () => {
    const { input } = harness(tokenResponse({ scope: ['read'] }));
    const session = await createLinearReadSession(input);
    expect(await session.getAccessToken()).toBe('synthetic-run-token');
    session.close();
  });

  it('latches expiration and honors run cancellation after authentication', async () => {
    const controller = new AbortController();
    const { input, advance } = harness(tokenResponse({ expires_in: 100 }), { signal: controller.signal });
    const session = await createLinearReadSession(input);
    advance(70_000);
    await expect(session.getAccessToken()).rejects.toThrow('expired');
    advance(-70_000);
    await expect(session.getAccessToken()).rejects.toThrow('closed');
    const next = await createLinearReadSession(input);
    controller.abort();
    await expect(next.getAccessToken()).rejects.toThrow('closed');
  });

  it('rejects an already-canceled run without requesting credentials or contacting Linear', async () => {
    const controller = new AbortController();
    controller.abort();
    let reads = 0;
    const { input, requests } = harness(tokenResponse(), { signal: controller.signal,
      readCredentials: async () => { reads++; return credentials; } });
    await expect(createLinearReadSession(input)).rejects.toThrow('authentication failed');
    expect(reads).toBe(0);
    expect(requests).toEqual([]);
  });

  it('bounds credential storage and transport even when they ignore cancellation', async () => {
    for (const changes of [{ readCredentials: async () => new Promise(() => {}) },
      { fetchImpl: async () => new Promise(() => {}) }]) {
      const { input } = harness(tokenResponse(), { timeoutMs: 5, ...changes });
      await expect(createLinearReadSession(input)).rejects.toThrow('authentication failed');
    }
  });

  it.each([new Response('private remote error', { status: 401 }), new Response('not JSON'),
    new Response('x'.repeat(16_385))])('does not expose remote error content', async (response) => {
    const { input } = harness(response);
    await expect(createLinearReadSession(input)).rejects.toThrow(/^Linear read-only app authentication failed\.$/);
  });

  it('redacts credential-store failures', async () => {
    const { input, requests } = harness(tokenResponse(), { readCredentials: async () => {
      throw new Error('private-secret-and-path');
    } });
    await expect(createLinearReadSession(input)).rejects.toThrow(/^Linear read-only app authentication failed\.$/);
    expect(requests).toEqual([]);
  });
});

describe('private credential file fallback', () => {
  it('reads a complete owner-private credential file', async () => {
    const { file } = await credentialFile();
    expect(await readLinearClientCredentials(file)).toEqual(credentials);
  });

  it.each([0o644, 0o640])('rejects file permissions %o', async (mode) => {
    const { file } = await credentialFile();
    await chmod(file, mode);
    await expect(readLinearClientCredentials(file)).rejects.toThrow('unavailable or invalid');
  });

  it('rejects a directory readable by other users', async () => {
    const { file, privateDirectory } = await credentialFile();
    await chmod(privateDirectory, 0o755);
    await expect(readLinearClientCredentials(file)).rejects.toThrow('unavailable or invalid');
  });

  it('rejects symbolic and hard links', async () => {
    const { file, privateDirectory } = await credentialFile();
    const symbolic = path.join(privateDirectory, 'symbolic.json');
    await symlink(file, symbolic);
    await expect(readLinearClientCredentials(symbolic)).rejects.toThrow('unavailable or invalid');
    await link(file, path.join(privateDirectory, 'hard.json'));
    await expect(readLinearClientCredentials(file)).rejects.toThrow('unavailable or invalid');
  });

  it.each([{ ...credentials, token: 'unexpected' }, { clientId: '', clientSecret: 'private' },
    { clientId: credentials.clientId }, { clientId: credentials.clientId, clientSecret: 'secret\nprivate' }])('rejects malformed credential shape %j', async (value) => {
    const { file } = await credentialFile(value);
    await expect(readLinearClientCredentials(file)).rejects.toThrow('unavailable or invalid');
  });

  it('rejects oversized and malformed credential content without exposing it', async () => {
    const { file } = await credentialFile();
    for (const content of ['private-secret-not-json', 'x'.repeat(16_385)]) {
      await writeFile(file, content);
      await expect(readLinearClientCredentials(file)).rejects.toThrow(/^Private Linear client credentials are unavailable or invalid\.$/);
    }
  });
});
