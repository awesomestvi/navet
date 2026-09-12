import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import type { ViteInstallationAuthority } from './vite-installation-authority.ts';

const REQUEST_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const SECRET_PATTERN = /^[a-f0-9]{64}$/;
const ID_PATTERN = /^[a-f0-9]{32}$/;
const CODE_PATTERN = /^[a-f0-9]{12}$/;
const CLIENT_ID_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;

type ProviderId = 'home_assistant' | 'homey' | 'openhab';
type ProviderCookieIds = Partial<Record<ProviderId, string>>;
interface DevicePairingPreferences {
  language: string;
  use24HourTime: boolean;
  temperatureUnit: 'celsius' | 'fahrenheit';
}

interface PendingDeviceRequest {
  version: 1;
  id: string;
  requesterSecretHash: string;
  codeHash: string;
  createdAt: number;
  expiresAt: number;
  state: 'pending' | 'approved' | 'declined' | 'redeemed';
  approvedAt?: number;
  redeemedAt?: number;
  providerCookieIds?: ProviderCookieIds;
  preferences?: DevicePairingPreferences;
  deviceName?: string;
}

interface DeviceSessionRecord {
  version: 1;
  id: string;
  name: string;
  role?: 'primary';
  clientId?: string;
  directProviderSession?: boolean;
  providerCookieIds: ProviderCookieIds;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  revokedAt: number | null;
}

export interface ViteDeviceSessionAuthority {
  getProviderCookieId(req: IncomingMessage, providerId: ProviderId): string;
  hasDependentDevices(providerId: ProviderId, cookieId: string): boolean;
  isDelegatedRequest(req: IncomingMessage, providerId: ProviderId): boolean;
  replaceProviderCookieId(providerId: ProviderId, previousId: string, nextId: string): void;
  revokeCurrentDevice(req: IncomingMessage, res?: ServerResponse): boolean;
  handle(req: IncomingMessage, res: ServerResponse): Promise<void>;
}

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(digest(left));
  const b = Buffer.from(digest(right));
  return timingSafeEqual(a, b);
}

const supportedLanguages = new Set([
  'en', 'de', 'fr', 'nl', 'es', 'it', 'pt', 'pl', 'sv', 'no', 'da', 'fi', 'zh',
]);

function validPairingPreferences(value: unknown): DevicePairingPreferences | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const preferences = value as Record<string, unknown>;
  if (
    typeof preferences.language !== 'string' ||
    !supportedLanguages.has(preferences.language) ||
    typeof preferences.use24HourTime !== 'boolean' ||
    (preferences.temperatureUnit !== 'celsius' && preferences.temperatureUnit !== 'fahrenheit')
  ) {
    return undefined;
  }
  return {
    language: preferences.language,
    use24HourTime: preferences.use24HourTime,
    temperatureUnit: preferences.temperatureUnit,
  };
}

function cookieValue(req: IncomingMessage, name: string) {
  for (const entry of String(req.headers.cookie ?? '').split(';')) {
    const separator = entry.indexOf('=');
    if (separator > 0 && entry.slice(0, separator).trim() === name) {
      return entry.slice(separator + 1).trim();
    }
  }
  return '';
}

function deviceClientIdentity(req: IncomingMessage) {
  const clientId = String(req.headers['x-navet-device-client-id'] ?? '');
  let name = '';
  try {
    name = decodeURIComponent(String(req.headers['x-navet-device-name'] ?? ''));
  } catch {
    name = '';
  }
  name = Array.from(name, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f ? '' : character;
  })
    .join('')
    .trim()
    .slice(0, 64);
  return {
    clientId: CLIENT_ID_PATTERN.test(clientId) ? clientId : undefined,
    name: name || 'Navet device',
  };
}

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 8 * 1024) throw new Error('Device request is too large');
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as Record<string, unknown>;
}

function sendJson(res: ServerResponse, status: number, value: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(value));
}

function requestOrigin(req: IncomingMessage) {
  const forwarded = String(req.headers['x-forwarded-proto'] ?? '')
    .split(',')[0]
    .trim();
  const protocol = forwarded === 'https' || (req.socket as { encrypted?: boolean }).encrypted
    ? 'https'
    : 'http';
  return `${protocol}://${req.headers.host ?? 'localhost'}`;
}

export function createViteDeviceSessionAuthority(
  installationAuthority: ViteInstallationAuthority,
  options: { cacheDirectory?: string } = {}
): ViteDeviceSessionAuthority {
  const cacheDirectory = options.cacheDirectory ?? path.resolve(process.cwd(), '.cache');
  const requestsDirectory = path.join(cacheDirectory, 'navet-device-requests');
  const sessionsDirectory = path.join(cacheDirectory, 'navet-device-sessions');
  const providerRecords: Record<ProviderId, { cookieName: string; directory: string }> = {
    home_assistant: {
      cookieName: installationAuthority.getCookieNames('navet_auth_session').currentName,
      directory: path.join(cacheDirectory, 'navet-auth-sessions'),
    },
    homey: {
      cookieName: installationAuthority.getCookieNames('navet_homey_session').currentName,
      directory: path.join(cacheDirectory, 'navet-provider-sessions', 'homey'),
    },
    openhab: {
      cookieName: installationAuthority.getCookieNames('navet_openhab_session').currentName,
      directory: path.join(cacheDirectory, 'navet-provider-sessions', 'openhab'),
    },
  };
  const deviceCookieName = installationAuthority.getCookieNames('navet_device_session').currentName;
  const rateBuckets = new Map<string, { count: number; resetAt: number }>();

  const consumeRate = (req: IncomingMessage, action: string, limit: number) => {
    const address = req.socket.remoteAddress ?? 'local';
    const key = `${action}:${address}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      rateBuckets.set(key, { count: 1, resetAt: now + 5 * 60 * 1000 });
      return true;
    }
    bucket.count += 1;
    return bucket.count <= limit;
  };

  const readJson = <T>(filePath: string): T | null => {
    try {
      if (statSync(filePath).size > 64 * 1024) return null;
      return JSON.parse(readFileSync(filePath, 'utf8')) as T;
    } catch {
      return null;
    }
  };
  const writeJson = (filePath: string, value: unknown) => {
    mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
    const temporary = `${filePath}.tmp-${randomBytes(8).toString('hex')}`;
    writeFileSync(temporary, JSON.stringify(value), { encoding: 'utf8', mode: 0o600 });
    renameSync(temporary, filePath);
  };
  const requestPath = (id: string) => path.join(requestsDirectory, `${id}.json`);
  const sessionPath = (id: string) => path.join(sessionsDirectory, `${id}.json`);
  const getDeviceSession = (req: IncomingMessage) => {
    const id = cookieValue(req, deviceCookieName);
    if (!SECRET_PATTERN.test(id)) return null;
    const record = readJson<DeviceSessionRecord>(sessionPath(id));
    if (
      !record ||
      record.version !== 1 ||
      record.revokedAt !== null ||
      record.expiresAt < Date.now()
    ) {
      return null;
    }
    if (record.updatedAt + 60 * 1000 < Date.now()) {
      record.updatedAt = Date.now();
      writeJson(sessionPath(id), record);
    }
    return { id, record };
  };
  const directProviderCookieIds = (req: IncomingMessage) => {
    const result: ProviderCookieIds = {};
    for (const providerId of Object.keys(providerRecords) as ProviderId[]) {
      const provider = providerRecords[providerId];
      const id = cookieValue(req, provider.cookieName);
      const record = SECRET_PATTERN.test(id)
        ? readJson<{ auth?: unknown; updatedAt?: number }>(path.join(provider.directory, `${id}.json`))
        : null;
      if (record?.auth && typeof record.updatedAt === 'number' && record.updatedAt + SESSION_TTL_MS >= Date.now()) {
        result[providerId] = id;
      }
    }
    return result;
  };
  const validProviderCookieIds = (candidateIds: ProviderCookieIds) => {
    const result: ProviderCookieIds = {};
    for (const providerId of Object.keys(candidateIds) as ProviderId[]) {
      const provider = providerRecords[providerId];
      const cookieId = candidateIds[providerId] ?? '';
      const record = SECRET_PATTERN.test(cookieId)
        ? readJson<{ auth?: unknown; updatedAt?: number }>(path.join(provider.directory, `${cookieId}.json`))
        : null;
      if (record?.auth && typeof record.updatedAt === 'number' && record.updatedAt + SESSION_TTL_MS >= Date.now()) {
        result[providerId] = cookieId;
      }
    }
    return result;
  };
  const primaryProviderCookieIds = (req: IncomingMessage) => {
    const requestedDeviceId = cookieValue(req, deviceCookieName);
    const currentDevice = getDeviceSession(req);
    if (currentDevice) {
      return currentDevice.record.role === 'primary'
        ? validProviderCookieIds(currentDevice.record.providerCookieIds)
        : {};
    }
    if (SECRET_PATTERN.test(requestedDeviceId) && readJson(sessionPath(requestedDeviceId))) {
      return {};
    }
    return directProviderCookieIds(req);
  };
  const hasOtherActivePrimaryProviderSession = (req: IncomingMessage) =>
    (Object.keys(providerRecords) as ProviderId[]).some((providerId) => {
      const provider = providerRecords[providerId];
      const currentCookieId = cookieValue(req, provider.cookieName);
      let names: string[] = [];
      try {
        names = readdirSync(provider.directory);
      } catch {
        return false;
      }
      return names.slice(0, 256).some((name) => {
        const id = name.replace(/\.json$/, '');
        if (id === currentCookieId) return false;
        const record = SECRET_PATTERN.test(id)
          ? readJson<{ auth?: unknown; updatedAt?: number }>(path.join(provider.directory, name))
          : null;
        return Boolean(
          record?.auth &&
          typeof record.updatedAt === 'number' &&
          record.updatedAt + SESSION_TTL_MS >= Date.now()
        );
      });
    });
  const deviceCookie = (req: IncomingMessage, value: string, maxAge: number) => {
    const secure = requestOrigin(req).startsWith('https://') ? '; Secure' : '';
    return `${deviceCookieName}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Strict${secure}`;
  };
  const demoteOtherPrimaryDevices = (primaryId: string) => {
    let names: string[] = [];
    try {
      names = readdirSync(sessionsDirectory);
    } catch {
      return;
    }
    for (const name of names.slice(0, 256)) {
      const id = name.replace(/\.json$/, '');
      if (id === primaryId || !SECRET_PATTERN.test(id)) continue;
      const record = readJson<DeviceSessionRecord>(sessionPath(id));
      if (!record || record.role !== 'primary') continue;
      delete record.role;
      record.directProviderSession = false;
      writeJson(sessionPath(id), record);
    }
  };
  const registerPrimaryDevice = (
    req: IncomingMessage,
    res: ServerResponse,
    providerCookieIds: ProviderCookieIds
  ) => {
    const identity = deviceClientIdentity(req);
    let existing: { id: string; record: DeviceSessionRecord } | null = null;
    if (identity.clientId) {
      let names: string[] = [];
      try {
        names = readdirSync(sessionsDirectory);
      } catch {
        names = [];
      }
      for (const name of names.slice(0, 256)) {
        const id = name.replace(/\.json$/, '');
        const record = SECRET_PATTERN.test(id)
          ? readJson<DeviceSessionRecord>(sessionPath(id))
          : null;
        if (
          record?.clientId === identity.clientId &&
          !record.revokedAt &&
          record.expiresAt >= Date.now()
        ) {
          existing = { id, record };
          break;
        }
      }
    }

    const id = existing?.id ?? randomBytes(32).toString('hex');
    const record: DeviceSessionRecord = existing?.record ?? {
      version: 1,
      id,
      name: identity.name,
      role: 'primary',
      clientId: identity.clientId,
      directProviderSession: true,
      providerCookieIds: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS,
      revokedAt: null,
    };
    record.directProviderSession = true;
    record.role = 'primary';
    record.providerCookieIds = { ...record.providerCookieIds, ...providerCookieIds };
    record.updatedAt = Date.now();
    record.expiresAt = Date.now() + SESSION_TTL_MS;
    writeJson(sessionPath(id), record);
    res.setHeader('Set-Cookie', deviceCookie(req, id, SESSION_TTL_MS / 1000));
    return { id, record };
  };

  const authority: ViteDeviceSessionAuthority = {
    getProviderCookieId(req, providerId) {
      const context = getDeviceSession(req);
      const id = context?.record.providerCookieIds[providerId] ?? '';
      return SECRET_PATTERN.test(id) ? id : '';
    },
    hasDependentDevices(providerId, cookieId) {
      let names: string[] = [];
      try { names = readdirSync(sessionsDirectory); } catch { return false; }
      return names.slice(0, 256).some((name) => {
        const id = name.replace(/\.json$/, '');
        const record = SECRET_PATTERN.test(id) ? readJson<DeviceSessionRecord>(sessionPath(id)) : null;
        return Boolean(
          record &&
          !record.revokedAt &&
          record.expiresAt >= Date.now() &&
          record.providerCookieIds[providerId] === cookieId
        );
      });
    },
    isDelegatedRequest(req, providerId) {
      return Boolean(authority.getProviderCookieId(req, providerId));
    },
    replaceProviderCookieId(providerId, previousId, nextId) {
      let names: string[] = [];
      try {
        names = readdirSync(sessionsDirectory);
      } catch {
        return;
      }
      for (const name of names.slice(0, 256)) {
        if (!SECRET_PATTERN.test(name.replace(/\.json$/, ''))) continue;
        const filePath = path.join(sessionsDirectory, name);
        const record = readJson<DeviceSessionRecord>(filePath);
        if (record?.providerCookieIds[providerId] === previousId) {
          record.providerCookieIds[providerId] = nextId;
          record.updatedAt = Date.now();
          writeJson(filePath, record);
        }
      }
    },
    revokeCurrentDevice(req, res) {
      const context = getDeviceSession(req);
      if (context) {
        context.record.revokedAt = Date.now();
        context.record.updatedAt = Date.now();
        writeJson(sessionPath(context.id), context.record);
      }
      res?.setHeader('Set-Cookie', deviceCookie(req, '', 0));
      return Boolean(context);
    },
    async handle(req, res) {
      if (req.method !== 'GET' && (!req.headers.origin || req.headers.origin !== requestOrigin(req))) {
        sendJson(res, 403, { error: 'Cross-origin device authorization is not allowed' });
        return;
      }
      const url = new URL(req.url ?? '/', requestOrigin(req));
      const route = url.pathname.replace(/^\/__navet_devices__/, '');
      const action = `${route}:${req.method ?? 'GET'}`;
      if (!consumeRate(req, action, req.method === 'GET' ? 240 : route === '/request' ? 20 : 30)) {
        sendJson(res, 429, { error: 'Too many device authorization attempts. Try again shortly.' });
        return;
      }
      if (route === '/availability' && req.method === 'GET') {
        sendJson(res, 200, { available: hasOtherActivePrimaryProviderSession(req) });
        return;
      }
      if (route === '/request' && req.method === 'POST') {
        const body = await readBody(req);
        let names: string[] = [];
        try { names = readdirSync(requestsDirectory); } catch { names = []; }
        let activeCount = 0;
        for (const name of names) {
          const id = name.replace(/\.json$/, '');
          const existing = ID_PATTERN.test(id) ? readJson<PendingDeviceRequest>(requestPath(id)) : null;
          if (!existing || existing.expiresAt < Date.now() || existing.state === 'redeemed') {
            rmSync(path.join(requestsDirectory, name), { force: true });
          } else {
            activeCount += 1;
          }
        }
        if (activeCount >= 256) {
          sendJson(res, 503, { error: 'Too many pending device requests. Try again shortly.' });
          return;
        }
        const id = randomBytes(16).toString('hex');
        const requesterSecret = randomBytes(32).toString('hex');
        const rawCode = randomBytes(6).toString('hex');
        const expiresAt = Date.now() + REQUEST_TTL_MS;
        writeJson(requestPath(id), {
          version: 1,
          id,
          requesterSecretHash: digest(requesterSecret),
          codeHash: digest(rawCode),
          createdAt: Date.now(),
          expiresAt,
          state: 'pending',
          deviceName:
            typeof body.deviceName === 'string'
              ? body.deviceName.trim().slice(0, 64)
              : 'Navet screen',
        } satisfies PendingDeviceRequest);
        sendJson(res, 201, {
          id,
          requesterSecret,
          code: rawCode.match(/.{1,4}/g)?.join('-') ?? rawCode,
          expiresAt,
        });
        return;
      }
      if (route === '/request' && req.method === 'GET') {
        const id = url.searchParams.get('id') ?? '';
        const secret = url.searchParams.get('secret') ?? '';
        const record = ID_PATTERN.test(id) ? readJson<PendingDeviceRequest>(requestPath(id)) : null;
        if (!record || !SECRET_PATTERN.test(secret) || !safeEqual(digest(secret), record.requesterSecretHash)) {
          sendJson(res, 404, { error: 'Device request not found' });
          return;
        }
        sendJson(res, 200, {
          id,
          state: record.expiresAt < Date.now() && record.state === 'pending' ? 'expired' : record.state,
          expiresAt: record.expiresAt,
        });
        return;
      }
      if (route === '/approve' && req.method === 'POST') {
        const body = await readBody(req);
        const code = String(body.code ?? '').toLowerCase().replace(/[^a-f0-9]/g, '');
        const providerCookieIds = primaryProviderCookieIds(req);
        if (!CODE_PATTERN.test(code) || Object.keys(providerCookieIds).length === 0) {
          sendJson(res, 403, { error: 'A signed-in primary device is required' });
          return;
        }
        let found: PendingDeviceRequest | null = null;
        try {
          for (const name of readdirSync(requestsDirectory).slice(0, 256)) {
            const candidate = readJson<PendingDeviceRequest>(path.join(requestsDirectory, name));
            if (candidate?.state === 'pending' && candidate.expiresAt >= Date.now() && safeEqual(digest(code), candidate.codeHash)) {
              found = candidate;
              break;
            }
          }
        } catch {
          // An empty request directory has no approvable request.
        }
        if (!found) {
          sendJson(res, 404, { error: 'That device request expired or was already used' });
          return;
        }
        found.state = 'approved';
        found.approvedAt = Date.now();
        found.providerCookieIds = providerCookieIds;
        found.preferences = validPairingPreferences(body.preferences);
        writeJson(requestPath(found.id), found);
        sendJson(res, 200, { approved: true, providers: Object.keys(providerCookieIds) });
        return;
      }
      if (route === '/preview' && req.method === 'POST') {
        const body = await readBody(req);
        const code = String(body.code ?? '').toLowerCase().replace(/[^a-f0-9]/g, '');
        const providerCookieIds = primaryProviderCookieIds(req);
        if (!CODE_PATTERN.test(code) || Object.keys(providerCookieIds).length === 0) {
          sendJson(res, 403, { error: 'A signed-in primary device is required' });
          return;
        }
        let found: PendingDeviceRequest | null = null;
        try {
          for (const name of readdirSync(requestsDirectory).slice(0, 256)) {
            const candidate = readJson<PendingDeviceRequest>(path.join(requestsDirectory, name));
            if (candidate?.state === 'pending' && candidate.expiresAt >= Date.now() && safeEqual(digest(code), candidate.codeHash)) {
              found = candidate;
              break;
            }
          }
        } catch {
          // An empty request directory has no previewable request.
        }
        if (!found) {
          sendJson(res, 404, { error: 'That device request expired or was already used' });
          return;
        }
        sendJson(res, 200, {
          code: code.match(/.{1,4}/g)?.join('-') ?? code,
          deviceName: found.deviceName ?? 'Navet screen',
          providers: Object.keys(providerCookieIds),
          expiresAt: found.expiresAt,
        });
        return;
      }
      if (route === '/deny' && req.method === 'POST') {
        const body = await readBody(req);
        const code = String(body.code ?? '').toLowerCase().replace(/[^a-f0-9]/g, '');
        if (!CODE_PATTERN.test(code) || Object.keys(primaryProviderCookieIds(req)).length === 0) {
          sendJson(res, 403, { error: 'A signed-in primary device is required' });
          return;
        }
        let found: PendingDeviceRequest | null = null;
        try {
          for (const name of readdirSync(requestsDirectory).slice(0, 256)) {
            const candidate = readJson<PendingDeviceRequest>(path.join(requestsDirectory, name));
            if (candidate?.state === 'pending' && candidate.expiresAt >= Date.now() && safeEqual(digest(code), candidate.codeHash)) {
              found = candidate;
              break;
            }
          }
        } catch {
          // An empty request directory has no deniable request.
        }
        if (!found) {
          sendJson(res, 404, { error: 'That device request expired or was already used' });
          return;
        }
        found.state = 'declined';
        writeJson(requestPath(found.id), found);
        sendJson(res, 200, { declined: true });
        return;
      }
      if (route === '/redeem' && req.method === 'POST') {
        const body = await readBody(req);
        const id = String(body.id ?? '');
        const secret = String(body.requesterSecret ?? '');
        const record = ID_PATTERN.test(id) ? readJson<PendingDeviceRequest>(requestPath(id)) : null;
        if (!record || !record.providerCookieIds || record.state !== 'approved' || record.expiresAt < Date.now() || !SECRET_PATTERN.test(secret) || !safeEqual(digest(secret), record.requesterSecretHash)) {
          sendJson(res, 403, { error: 'This device approval is unavailable' });
          return;
        }
        const claimedPath = `${requestPath(id)}.redeeming`;
        try {
          renameSync(requestPath(id), claimedPath);
        } catch {
          sendJson(res, 403, { error: 'This device approval was already used' });
          return;
        }
        const claimed = readJson<PendingDeviceRequest>(claimedPath);
        if (!claimed || claimed.state !== 'approved' || !SECRET_PATTERN.test(secret) || !safeEqual(digest(secret), claimed.requesterSecretHash)) {
          rmSync(claimedPath, { force: true });
          sendJson(res, 403, { error: 'This device approval is unavailable' });
          return;
        }
        const providerCookieIds = validProviderCookieIds(claimed.providerCookieIds ?? {});
        if (Object.keys(providerCookieIds).length === 0) {
          rmSync(claimedPath, { force: true });
          sendJson(res, 403, { error: 'The approving session is no longer available' });
          return;
        }
        const deviceId = randomBytes(32).toString('hex');
        writeJson(sessionPath(deviceId), {
          version: 1,
          id: deviceId,
          name: claimed.deviceName || 'Navet device',
          providerCookieIds,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          expiresAt: Date.now() + SESSION_TTL_MS,
          revokedAt: null,
        } satisfies DeviceSessionRecord);
        rmSync(claimedPath, { force: true });
        res.setHeader('Set-Cookie', deviceCookie(req, deviceId, SESSION_TTL_MS / 1000));
        sendJson(res, 200, {
          connected: true,
          preferences: validPairingPreferences(claimed.preferences) ?? null,
        });
        return;
      }
      if (route === '/sessions' && req.method === 'PATCH') {
        if (Object.keys(primaryProviderCookieIds(req)).length === 0) {
          sendJson(res, 403, { error: 'A signed-in primary device is required' });
          return;
        }
        const body = await readBody(req);
        const id = String(body.id ?? '');
        const record = SECRET_PATTERN.test(id)
          ? readJson<DeviceSessionRecord>(sessionPath(id))
          : null;
        if (!record) {
          sendJson(res, 404, { error: 'Device not found' });
          return;
        }
        if (body.role === 'primary') {
          demoteOtherPrimaryDevices(id);
          record.role = 'primary';
          record.directProviderSession = true;
          record.updatedAt = Date.now();
          writeJson(sessionPath(id), record);
          sendJson(res, 200, { updated: true });
          return;
        }
        const name = typeof body.name === 'string' ? body.name.trim().slice(0, 64) : '';
        if (!name) {
          sendJson(res, 400, { error: 'Choose a valid device name' });
          return;
        }
        record.name = name;
        record.updatedAt = Date.now();
        writeJson(sessionPath(id), record);
        sendJson(res, 200, { updated: true });
        return;
      }
      if (route === '/current' && req.method === 'DELETE') {
        authority.revokeCurrentDevice(req, res);
        sendJson(res, 200, { revoked: true });
        return;
      }
      if (route === '/sessions' && req.method === 'GET') {
        const isPrimary = Object.keys(primaryProviderCookieIds(req)).length > 0;
        let currentDevice = getDeviceSession(req);
        if (isPrimary && !currentDevice) {
          currentDevice = registerPrimaryDevice(req, res, directProviderCookieIds(req));
        }
        if (!isPrimary && !currentDevice) {
          sendJson(res, 403, { error: 'An authorized Navet device is required' });
          return;
        }
        let names: string[] = [];
        try { names = readdirSync(sessionsDirectory); } catch { names = []; }
        const devices = names.slice(0, 256).flatMap((name) => {
          const id = name.replace(/\.json$/, '');
          const record = SECRET_PATTERN.test(id) ? readJson<DeviceSessionRecord>(sessionPath(id)) : null;
          return record && !record.revokedAt && record.expiresAt >= Date.now()
            ? [{
                id: record.id,
                name: record.name,
                role: record.role === 'primary' ? 'primary' : 'authorized',
                providers: Object.keys(record.providerCookieIds),
                createdAt: record.createdAt,
                lastActivityAt: record.updatedAt,
                expiresAt: record.expiresAt,
              }]
            : [];
        });
        sendJson(res, 200, {
          access: isPrimary ? 'primary' : 'authorized',
          currentDeviceId: currentDevice?.id ?? null,
          devices,
        });
        return;
      }
      if (route === '/sessions' && req.method === 'DELETE') {
        if (Object.keys(primaryProviderCookieIds(req)).length === 0) {
          sendJson(res, 403, { error: 'A signed-in primary device is required' });
          return;
        }
        const body = await readBody(req);
        const id = String(body.id ?? '');
        const record = SECRET_PATTERN.test(id) ? readJson<DeviceSessionRecord>(sessionPath(id)) : null;
        if (!record) {
          sendJson(res, 404, { error: 'Device not found' });
          return;
        }
        if (record.directProviderSession) {
          for (const providerId of Object.keys(record.providerCookieIds) as ProviderId[]) {
            const provider = providerRecords[providerId];
            const cookieId = record.providerCookieIds[providerId] ?? '';
            if (provider && SECRET_PATTERN.test(cookieId)) {
              rmSync(path.join(provider.directory, `${cookieId}.json`), { force: true });
            }
          }
        }
        record.revokedAt = Date.now();
        record.updatedAt = Date.now();
        writeJson(sessionPath(id), record);
        sendJson(res, 200, { revoked: true });
        return;
      }
      if (route === '/providers' && req.method === 'DELETE') {
        const body = await readBody(req);
        const providerId = String(body.providerId ?? '') as ProviderId;
        const primaryIds = primaryProviderCookieIds(req);
        if (!providerRecords[providerId] || !primaryIds[providerId]) {
          sendJson(res, 403, { error: 'A signed-in primary provider session is required' });
          return;
        }
        let names: string[] = [];
        try { names = readdirSync(sessionsDirectory); } catch { names = []; }
        for (const name of names.slice(0, 256)) {
          const id = name.replace(/\.json$/, '');
          const record = SECRET_PATTERN.test(id) ? readJson<DeviceSessionRecord>(sessionPath(id)) : null;
          if (record?.providerCookieIds[providerId]) {
            delete record.providerCookieIds[providerId];
            record.updatedAt = Date.now();
            if (Object.keys(record.providerCookieIds).length === 0) record.revokedAt = Date.now();
            writeJson(sessionPath(record.id), record);
          }
        }
        sendJson(res, 200, { invalidated: true });
        return;
      }
      sendJson(res, 404, { error: 'Unknown device authorization endpoint' });
    },
  };
  return authority;
}
