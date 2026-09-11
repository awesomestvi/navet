import type { IncomingMessage, ServerResponse } from 'node:http';
import { type PreviewServer, type ViteDevServer } from 'vite';
import { type ViteInstallationAuthority } from './vite-installation-authority.ts';
import type { ViteDeviceSessionAuthority } from './vite-device-session-authority.ts';
import {
  appendHomeyOAuthCallbackMarker,
  appendHomeyOAuthFailureMarker,
  createViteHomeySessionStore,
  HOMEY_OAUTH_PENDING_TTL_MS,
  HOMEY_SESSION_COOKIE_NAME as HOMEY_SESSION_COOKIE_BASE_NAME,
  type HomeyOAuthFailureCode,
  type HomeySessionData,
  isConfirmedInvalidHomeyRefreshError,
  normalizeHomeyRefreshTokenPayload,
  type ViteStoredHomeySession,
} from './vite-homey-session-store.ts';
import {
  clearViteProviderSessionCookie,
  createViteProviderRequestSession,
  createViteProviderState,
  deleteViteProviderRequestSessions,
  findViteProviderRequestSession,
  getViteProviderRequestOrigin,
  getViteProviderRequestSession,
  isViteProviderSessionCapacityError,
  isViteProviderSessionRecordTooLargeError,
  isViteStrictSameOriginMutation,
  PROVIDER_SESSION_CAPACITY_ERROR_CODE,
  PROVIDER_SESSION_CAPACITY_STATUS,
  PROVIDER_SESSION_RECORD_TOO_LARGE_ERROR_CODE,
  PROVIDER_SESSION_RECORD_TOO_LARGE_STATUS,
  rotateViteProviderRequestSession,
  setViteProviderSessionCookie,
} from './vite-provider-session-store.ts';

const HOMEY_SESSION_MAX_BYTES = 8 * 1024;
export function homeySessionStorePlugin(
  installationAuthority: ViteInstallationAuthority,
  deviceSessionAuthority?: ViteDeviceSessionAuthority
) {
  const HOMEY_SESSION_COOKIE_NAME = installationAuthority.getCookieNames(
    HOMEY_SESSION_COOKIE_BASE_NAME
  );
  const homeySessionStore = createViteHomeySessionStore({
    cookieNames: HOMEY_SESSION_COOKIE_NAME,
    deviceSessionAuthority,
  });
  const setHomeySessionCookie = (
    req: IncomingMessage,
    res: ServerResponse,
    cookieId: string
  ) => {
    if (!deviceSessionAuthority?.isDelegatedRequest(req, 'homey')) {
      setViteProviderSessionCookie(req, res, HOMEY_SESSION_COOKIE_NAME, cookieId);
    }
  };
  const athomApiBaseUrl = 'https://api.athom.com';
  const defaultHomeyCallbackPath = '/__navet_homey__/callback';
  const sessionTouchIntervalMs = 24 * 60 * 60 * 1000;

  class HomeyRefreshError extends Error {
    readonly confirmedInvalid: boolean;

    constructor(message: string, confirmedInvalid: boolean) {
      super(message);
      this.confirmedInvalid = confirmedInvalid;
    }
  }

  class HomeySessionSupersededError extends Error {}

  const setNoStoreHeaders = (res: ServerResponse) => {
    res.setHeader('Cache-Control', 'no-store');
  };

  const sendJson = (res: ServerResponse, statusCode: number, payload: Record<string, unknown>) => {
    res.statusCode = statusCode;
    setNoStoreHeaders(res);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
  };

  const sendNoContent = (res: ServerResponse) => {
    res.statusCode = 204;
    setNoStoreHeaders(res);
    res.end();
  };

  const sendSessionStoreError = (res: ServerResponse, error: unknown) => {
    let code: string;
    let status: number;
    if (isViteProviderSessionRecordTooLargeError(error)) {
      code = PROVIDER_SESSION_RECORD_TOO_LARGE_ERROR_CODE;
      status = PROVIDER_SESSION_RECORD_TOO_LARGE_STATUS;
    } else if (isViteProviderSessionCapacityError(error)) {
      code = PROVIDER_SESSION_CAPACITY_ERROR_CODE;
      status = PROVIDER_SESSION_CAPACITY_STATUS;
    } else {
      return false;
    }
    sendJson(res, status, {
      error: error.message,
      code,
    });
    return true;
  };

  const getHomeyCallbackPath = (redirectUri: string) => {
    try {
      const pathname = new URL(redirectUri).pathname.trim();
      return pathname || defaultHomeyCallbackPath;
    } catch {
      return defaultHomeyCallbackPath;
    }
  };

  const getHomeyOAuthConfig = (req: IncomingMessage) => {
    const clientId = process.env.NAVET_HOMEY_CLIENT_ID?.trim();
    const clientSecret = process.env.NAVET_HOMEY_CLIENT_SECRET?.trim();
    const redirectUri =
      process.env.NAVET_HOMEY_REDIRECT_URI?.trim() ??
      `${getViteProviderRequestOrigin(req)}${defaultHomeyCallbackPath}`;
    const callbackPath = getHomeyCallbackPath(redirectUri);

    return {
      clientId,
      clientSecret,
      redirectUri,
      callbackPath,
    };
  };

  const normalizeHomeyReturnTo = (value: unknown, req: IncomingMessage) => {
    const rawIngressPath =
      typeof req.headers['x-ingress-path'] === 'string' ? req.headers['x-ingress-path'].trim() : '';
    const ingressPath =
      rawIngressPath && rawIngressPath !== '/'
        ? `/${rawIngressPath.replace(/^\/+|\/+$/g, '')}`
        : '';
    const fallback = ingressPath ? `${ingressPath}/` : '/';
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
      return fallback;
    }

    try {
      const origin = getViteProviderRequestOrigin(req);
      const parsed = new URL(value, origin);
      if (
        parsed.origin !== origin ||
        (ingressPath &&
          parsed.pathname !== ingressPath &&
          !parsed.pathname.startsWith(`${ingressPath}/`))
      ) {
        return fallback;
      }
      for (const parameter of [
        'homey_oauth_callback',
        'homey_oauth_error',
        'code',
        'state',
        'error',
        'error_description',
        'error_uri',
      ]) {
        parsed.searchParams.delete(parameter);
      }
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return fallback;
    }
  };

  const encodeClientCredentials = (clientId: string, clientSecret: string) =>
    Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const normalizeHomeyOAuthToken = (value: unknown) => {
    if (!value || typeof value !== 'object') {
      return null;
    }
    const token = value as Record<string, unknown>;
    const accessToken = typeof token.access_token === 'string' ? token.access_token.trim() : '';
    const refreshToken = typeof token.refresh_token === 'string' ? token.refresh_token.trim() : '';
    const expiresIn = Number(token.expires_in);
    return accessToken && refreshToken && Number.isFinite(expiresIn) && expiresIn > 0
      ? {
          accessToken,
          refreshToken,
          expiresIn,
        }
      : null;
  };

  const getHomeyBaseUrlCandidates = (homey: HomeySessionData['homeys'][number]) =>
    Array.from(
      new Set([homey.localUrlSecure, homey.localUrl, homey.remoteUrl].filter(Boolean))
    ) as string[];

  const sanitizeHomeySession = (session: HomeySessionData) => ({
    userId: session.userId ?? null,
    user: session.user ?? null,
    homeys: session.homeys,
    selectedHomeyId: session.selectedHomeyId ?? null,
    homeyBaseUrl: session.homeyBaseUrl ?? null,
    hasActiveHomeySession: Boolean(session.homeySessionToken),
  });

  const getHomeyUserName = (user: {
    firstname?: string | null;
    lastname?: string | null;
    name?: string | null;
    email?: string | null;
  }) => {
    const first = user.firstname?.trim() ?? '';
    const last = user.lastname?.trim() ?? '';
    const fullName = `${first} ${last}`.trim();
    return fullName || user.name?.trim() || user.email?.trim() || 'Homey User';
  };

  const getHomeyUserAvatarUrl = (user: {
    avatar?: string | null;
    avatarUrl?: string | null;
    image?: string | null;
    imageUrl?: string | null;
    gravatar?: string | null;
  }) => {
    const candidates = [user.avatarUrl, user.imageUrl, user.avatar, user.image, user.gravatar];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }

    return null;
  };

  const refreshHomeyAccessToken = async (
    session: HomeySessionData,
    req: IncomingMessage,
    persistSession: (session: HomeySessionData) => void
  ): Promise<HomeySessionData> => {
    if (session.expiresAt > Date.now() + 30_000) {
      return session;
    }

    const { clientId, clientSecret } = getHomeyOAuthConfig(req);
    if (!clientId || !clientSecret) {
      throw new Error('Homey OAuth credentials are not configured');
    }

    const response = await fetch(`${athomApiBaseUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${encodeClientCredentials(clientId, clientSecret)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: session.refreshToken,
      }),
    });

    if (!response.ok) {
      let payload: { error?: unknown } | null = null;
      try {
        payload = JSON.parse(await response.text()) as { error?: unknown };
      } catch {
        payload = null;
      }
      throw new HomeyRefreshError(
        'Unable to refresh Homey OAuth token',
        isConfirmedInvalidHomeyRefreshError(payload)
      );
    }

    const token = normalizeHomeyRefreshTokenPayload(await response.json(), session.refreshToken);
    if (!token) {
      throw new HomeyRefreshError('Homey OAuth refresh returned an invalid token', false);
    }

    const nextSession: HomeySessionData = {
      ...session,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: Date.now() + token.expiresIn * 1000,
    };

    persistSession(nextSession);
    return nextSession;
  };

  const loadAuthenticatedUser = async (accessToken: string) => {
    const response = await fetch(`${athomApiBaseUrl}/user/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Unable to load Homey account');
    }

    return (await response.json()) as {
      _id?: string;
      firstname?: string | null;
      lastname?: string | null;
      name?: string | null;
      email?: string | null;
      avatar?: string | null;
      avatarUrl?: string | null;
      image?: string | null;
      imageUrl?: string | null;
      gravatar?: string | null;
      homeys?: Array<{
        _id?: string;
        name?: string;
        platform?: string | null;
        localUrl?: string | null;
        localUrlSecure?: string | null;
        remoteUrl?: string | null;
      }>;
    };
  };

  const createHomeySession = async (
    accessToken: string,
    homey: HomeySessionData['homeys'][number]
  ) => {
    const homeyBaseUrls = getHomeyBaseUrlCandidates(homey);
    if (homeyBaseUrls.length === 0) {
      throw new Error('The selected Homey has no usable URL');
    }

    const delegationResponse = await fetch(`${athomApiBaseUrl}/delegation/token?audience=homey`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!delegationResponse.ok) {
      throw new Error('Unable to create Homey delegation token');
    }

    const delegationToken = JSON.parse(await delegationResponse.text()) as string;

    let lastError: Error | null = null;
    const failedTargets: string[] = [];

    for (const homeyBaseUrl of homeyBaseUrls) {
      try {
        const sessionResponse = await fetch(`${homeyBaseUrl}/api/manager/users/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: delegationToken,
          }),
        });

        if (!sessionResponse.ok) {
          failedTargets.push(`${homeyBaseUrl} -> HTTP ${sessionResponse.status}`);
          lastError = new Error('Unable to create Homey session');
          continue;
        }

        const homeySessionToken = JSON.parse(await sessionResponse.text()) as string;
        return {
          homeyBaseUrl,
          homeySessionToken,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        failedTargets.push(`${homeyBaseUrl} -> ${message}`);
        lastError = error instanceof Error ? error : new Error('Unable to create Homey session');
      }
    }

    const detail = failedTargets.length > 0 ? ` (${failedTargets.join('; ')})` : '';
    throw new Error((lastError?.message ?? 'Unable to create Homey session') + detail);
  };

  const readRequestBody = async (req: IncomingMessage) => {
    const chunks: Buffer[] = [];
    let size = 0;

    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.byteLength;
      if (size > HOMEY_SESSION_MAX_BYTES) {
        throw new Error('Homey session is too large');
      }
      chunks.push(buffer);
    }

    return Buffer.concat(chunks).toString('utf8');
  };

  const writeHomeyRecord = (
    cookieId: string,
    record: ViteStoredHomeySession,
    overrides: Partial<Pick<ViteStoredHomeySession, 'auth' | 'pending'>>
  ) => {
    const next: ViteStoredHomeySession = {
      ...record,
      ...overrides,
      updatedAt: Date.now(),
    };
    homeySessionStore.writeSession(cookieId, next);
    return next;
  };

  const touchHomeyRecord = (
    req: IncomingMessage,
    res: ServerResponse | undefined,
    context: { cookieId: string; session: ViteStoredHomeySession }
  ) => {
    let next = context.session;
    if (next.updatedAt + sessionTouchIntervalMs < Date.now()) {
      next = writeHomeyRecord(context.cookieId, next, {});
    }
    if (res) {
      setHomeySessionCookie(req, res, context.cookieId);
    }
    return next;
  };

  const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === 'GET') {
      const context = getViteProviderRequestSession(
        req,
        HOMEY_SESSION_COOKIE_NAME,
        homeySessionStore
      );
      if (!context?.session.auth) {
        sendNoContent(res);
        return;
      }

      let record = context.session;
      const sendLatestSessionOrNoContent = () => {
        const latest = homeySessionStore.readSession(context.cookieId);
        if (!latest?.auth) {
          sendNoContent(res);
          return;
        }
        setHomeySessionCookie(req, res, context.cookieId);
        sendJson(res, 200, sanitizeHomeySession(latest.auth));
      };
      const persistSession = (session: HomeySessionData) => {
        const current = homeySessionStore.readSession(context.cookieId);
        if (!current || JSON.stringify(current) !== JSON.stringify(record)) {
          throw new HomeySessionSupersededError();
        }
        record = writeHomeyRecord(context.cookieId, record, { auth: session });
      };
      let session: HomeySessionData;
      try {
        session = await refreshHomeyAccessToken(context.session.auth, req, persistSession);
      } catch (error) {
        if (sendSessionStoreError(res, error)) {
          return;
        }
        if (error instanceof HomeySessionSupersededError) {
          sendLatestSessionOrNoContent();
          return;
        }
        if (error instanceof HomeyRefreshError && error.confirmedInvalid) {
          const current = homeySessionStore.readSession(context.cookieId);
          if (!current || JSON.stringify(current) !== JSON.stringify(record)) {
            sendLatestSessionOrNoContent();
            return;
          }
          clearViteProviderSessionCookie(req, res, HOMEY_SESSION_COOKIE_NAME, homeySessionStore);
          if (HOMEY_SESSION_COOKIE_NAME.scoped) {
            deleteViteProviderRequestSessions(req, HOMEY_SESSION_COOKIE_NAME, homeySessionStore);
          } else {
            homeySessionStore.deleteSession(context.cookieId);
          }
          sendNoContent(res);
          return;
        }
        session = context.session.auth;
      }
      const current = homeySessionStore.readSession(context.cookieId);
      if (!current || JSON.stringify(current) !== JSON.stringify(record)) {
        sendLatestSessionOrNoContent();
        return;
      }
      touchHomeyRecord(req, res, { cookieId: context.cookieId, session: record });
      res.statusCode = 200;
      setNoStoreHeaders(res);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(sanitizeHomeySession(session)));
      return;
    }

    if (req.method === 'DELETE') {
      const context = getViteProviderRequestSession(
        req,
        HOMEY_SESSION_COOKIE_NAME,
        homeySessionStore
      );
      if (!context) {
        sendJson(res, 401, { error: 'Bound browser session is required' });
        return;
      }
      if (!isViteStrictSameOriginMutation(req)) {
        sendJson(res, 403, { error: 'Cross-origin session mutation is not allowed' });
        return;
      }

      clearViteProviderSessionCookie(req, res, HOMEY_SESSION_COOKIE_NAME, homeySessionStore);
      deleteViteProviderRequestSessions(req, HOMEY_SESSION_COOKIE_NAME, homeySessionStore);
      sendJson(res, 200, { ok: true });
      return;
    }

    res.setHeader('Allow', 'GET, DELETE');
    sendJson(res, 405, { error: 'Method not allowed' });
  };

  const registerMiddleware = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use('/__navet_homey__/authorize', async (req, res) => {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        sendJson(res, 405, { error: 'Method not allowed' });
        return;
      }
      if (!isViteStrictSameOriginMutation(req)) {
        sendJson(res, 403, { error: 'Cross-origin OAuth start is not allowed' });
        return;
      }
      const installationAuthorization = installationAuthority.authorizeHomeyStart(req);
      if (!installationAuthorization.allowed) {
        sendJson(res, 403, {
          error: 'Homey enrollment is not authorized for this installation',
        });
        return;
      }

      const { clientId, redirectUri } = getHomeyOAuthConfig(req);
      if (!clientId) {
        sendJson(res, 500, { error: 'Homey OAuth client ID is not configured' });
        return;
      }

      let body: { returnTo?: unknown };
      try {
        body = JSON.parse(await readRequestBody(req)) as { returnTo?: unknown };
      } catch {
        sendJson(res, 400, { error: 'Invalid Homey OAuth request' });
        return;
      }
      let context: {
        cookieId: string;
        session: ViteStoredHomeySession;
      };
      let state: string;
      try {
        context = createViteProviderRequestSession(
          req,
          res,
          HOMEY_SESSION_COOKIE_NAME,
          homeySessionStore
        );
        state = createViteProviderState();
        writeHomeyRecord(context.cookieId, context.session, {
          pending: {
            state,
            returnTo: normalizeHomeyReturnTo(body.returnTo, req),
            expiresAt: Date.now() + HOMEY_OAUTH_PENDING_TTL_MS,
            installationPairingVerified: installationAuthorization.pairingVerified,
          },
        });
      } catch (error) {
        if (sendSessionStoreError(res, error)) {
          return;
        }
        throw error;
      }

      const loginUrl = new URL(`${athomApiBaseUrl}/oauth2/authorise`);
      loginUrl.searchParams.set('response_type', 'code');
      loginUrl.searchParams.set('client_id', clientId);
      loginUrl.searchParams.set('redirect_uri', redirectUri);
      loginUrl.searchParams.set('state', state);

      sendJson(res, 200, { authorizeUrl: loginUrl.toString() });
    });

    server.middlewares.use(async (req, res, next) => {
      const { callbackPath } = getHomeyOAuthConfig(req);
      const requestPath = new URL(req.url ?? '/', getViteProviderRequestOrigin(req)).pathname;
      if (requestPath !== callbackPath) {
        next();
        return;
      }

      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        sendJson(res, 405, { error: 'Method not allowed' });
        return;
      }

      const requestUrl = new URL(req.url ?? '/', getViteProviderRequestOrigin(req));
      const code = requestUrl.searchParams.get('code')?.trim() ?? '';
      const state = requestUrl.searchParams.get('state')?.trim() ?? '';
      const providerError = requestUrl.searchParams.get('error')?.trim() ?? '';
      const { clientId, clientSecret, redirectUri } = getHomeyOAuthConfig(req);
      const context = state
        ? findViteProviderRequestSession(
            req,
            HOMEY_SESSION_COOKIE_NAME,
            homeySessionStore,
            (candidate) => candidate.session.pending?.state === state
          )
        : null;
      const pending = context?.session.pending;

      if (
        !context ||
        !pending ||
        !state ||
        state !== pending.state ||
        pending.expiresAt < Date.now()
      ) {
        sendJson(res, 400, {
          error: 'Homey OAuth callback does not match this browser session',
        });
        return;
      }

      // Consume the browser-bound state before any upstream request. This makes
      // parallel callbacks and retries replay-resistant even when exchange fails.
      const consumed = writeHomeyRecord(context.cookieId, context.session, {
        pending: {
          ...pending,
          state: createViteProviderState(),
        },
      });

      const redirectFailure = (failure: HomeyOAuthFailureCode) => {
        res.statusCode = 302;
        setNoStoreHeaders(res);
        res.setHeader('Location', appendHomeyOAuthFailureMarker(pending.returnTo, failure));
        res.end();
      };

      if (providerError) {
        redirectFailure(
          providerError === 'access_denied' ? 'access_denied' : 'temporarily_unavailable'
        );
        return;
      }
      if (!code) {
        redirectFailure('callback_incomplete');
        return;
      }
      if (!clientId || !clientSecret) {
        redirectFailure('temporarily_unavailable');
        return;
      }

      try {
        const tokenResponse = await fetch(`${athomApiBaseUrl}/oauth2/token`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${encodeClientCredentials(clientId, clientSecret)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
          }),
        });

        if (!tokenResponse.ok) {
          redirectFailure('temporarily_unavailable');
          return;
        }

        let token: ReturnType<typeof normalizeHomeyOAuthToken>;
        try {
          token = normalizeHomeyOAuthToken(await tokenResponse.json());
        } catch {
          token = null;
        }
        if (!token) {
          redirectFailure('invalid_response');
          return;
        }
        const user = await loadAuthenticatedUser(token.accessToken);
        const mappedHomeys =
          user.homeys?.map((homey) =>
            homey._id && homey.name
              ? {
                  id: homey._id,
                  name: homey.name,
                  platform: homey.platform ?? null,
                  localUrl: homey.localUrl ?? null,
                  localUrlSecure: homey.localUrlSecure ?? null,
                  remoteUrl: homey.remoteUrl ?? null,
                }
              : null
          ) ?? [];
        const homeys = mappedHomeys.filter(
          (
            homey
          ): homey is {
            id: string;
            name: string;
            platform: string | null;
            localUrl: string | null;
            localUrlSecure: string | null;
            remoteUrl: string | null;
          } => Boolean(homey)
        );
        const authorityCurrent = homeySessionStore.readSession(context.cookieId);
        if (!authorityCurrent || JSON.stringify(authorityCurrent) !== JSON.stringify(consumed)) {
          redirectFailure('session_changed');
          return;
        }
        if (
          !installationAuthority.commitHomey(
            homeys.map((homey) => homey.id),
            pending.installationPairingVerified === true
          )
        ) {
          redirectFailure('not_authorized');
          return;
        }

        let session: HomeySessionData = {
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          expiresAt: Date.now() + token.expiresIn * 1000,
          userId: user._id ?? null,
          user: {
            id: user._id ?? null,
            name: getHomeyUserName(user),
            avatarUrl: getHomeyUserAvatarUrl(user),
            email: user.email ?? null,
          },
          homeys,
          selectedHomeyId: null,
          homeyBaseUrl: null,
          homeySessionToken: null,
        };

        if (homeys.length === 1) {
          try {
            const selection = await createHomeySession(session.accessToken, homeys[0]);
            session = {
              ...session,
              selectedHomeyId: homeys[0].id,
              homeyBaseUrl: selection.homeyBaseUrl,
              homeySessionToken: selection.homeySessionToken,
            };
          } catch {
            session = {
              ...session,
              selectedHomeyId: homeys[0].id,
              homeyBaseUrl:
                homeys[0].localUrlSecure ?? homeys[0].localUrl ?? homeys[0].remoteUrl ?? null,
              homeySessionToken: null,
            };
          }
        }

        const now = Date.now();
        const current = homeySessionStore.readSession(context.cookieId);
        if (!current || JSON.stringify(current) !== JSON.stringify(consumed)) {
          redirectFailure('session_changed');
          return;
        }
        rotateViteProviderRequestSession(
          req,
          res,
          HOMEY_SESSION_COOKIE_NAME,
          homeySessionStore,
          context.cookieId,
          {
            version: 1,
            createdAt: now,
            updatedAt: now,
            auth: session,
            pending: null,
          }
        );
        res.statusCode = 302;
        setNoStoreHeaders(res);
        res.setHeader('Location', appendHomeyOAuthCallbackMarker(pending.returnTo));
        res.end();
      } catch {
        redirectFailure('temporarily_unavailable');
      }
    });

    server.middlewares.use('/__navet_homey__/session', async (req, res) => {
      await handleRequest(req, res);
    });

    server.middlewares.use('/__navet_homey__/session/select', async (req, res) => {
      if (req.method !== 'PUT') {
        res.setHeader('Allow', 'PUT');
        sendJson(res, 405, { error: 'Method not allowed' });
        return;
      }
      if (!isViteStrictSameOriginMutation(req)) {
        sendJson(res, 403, { error: 'Cross-origin session mutation is not allowed' });
        return;
      }

      const context = getViteProviderRequestSession(
        req,
        HOMEY_SESSION_COOKIE_NAME,
        homeySessionStore
      );
      if (!context?.session.auth) {
        sendJson(res, 401, { error: 'Bound Homey OAuth session is required' });
        return;
      }
      let record = context.session;

      try {
        const persistSession = (session: HomeySessionData) => {
          const current = homeySessionStore.readSession(context.cookieId);
          if (!current || JSON.stringify(current) !== JSON.stringify(record)) {
            throw new HomeySessionSupersededError();
          }
          record = writeHomeyRecord(context.cookieId, record, { auth: session });
        };
        const session = await refreshHomeyAccessToken(context.session.auth, req, persistSession);
        const body = JSON.parse(await readRequestBody(req)) as { homeyId?: string };
        const homeyId = body.homeyId?.trim();
        if (!homeyId) {
          sendJson(res, 400, { error: 'homeyId is required' });
          return;
        }

        const homey = session.homeys.find((entry) => entry.id === homeyId);
        if (!homey) {
          sendJson(res, 404, { error: 'Homey not found in OAuth session' });
          return;
        }

        const selection = await createHomeySession(session.accessToken, homey);
        const nextSession: HomeySessionData = {
          ...session,
          selectedHomeyId: homey.id,
          homeyBaseUrl: selection.homeyBaseUrl,
          homeySessionToken: selection.homeySessionToken,
        };

        persistSession(nextSession);
        sendJson(res, 200, sanitizeHomeySession(nextSession));
      } catch (error) {
        if (sendSessionStoreError(res, error)) {
          return;
        }
        if (error instanceof HomeySessionSupersededError) {
          sendJson(res, 409, {
            error: 'Homey session changed before selection completed',
          });
          return;
        }
        if (error instanceof HomeyRefreshError && error.confirmedInvalid) {
          const current = homeySessionStore.readSession(context.cookieId);
          if (!current || JSON.stringify(current) !== JSON.stringify(record)) {
            sendJson(res, 409, {
              error: 'Homey session changed before selection completed',
            });
            return;
          }
          clearViteProviderSessionCookie(req, res, HOMEY_SESSION_COOKIE_NAME, homeySessionStore);
          if (HOMEY_SESSION_COOKIE_NAME.scoped) {
            deleteViteProviderRequestSessions(req, HOMEY_SESSION_COOKIE_NAME, homeySessionStore);
          } else {
            homeySessionStore.deleteSession(context.cookieId);
          }
          sendJson(res, 401, { error: 'Homey OAuth session has expired' });
          return;
        }
        sendJson(res, 502, {
          error: 'Unable to select Homey',
          details:
            error instanceof Error && error.message.trim() ? error.message.trim() : 'Unknown error',
        });
      }
    });
  };

  return {
    name: 'navet-homey-session-store',
    api: {
      getHomeySession(req: IncomingMessage, res?: ServerResponse): HomeySessionData | null {
        const context = getViteProviderRequestSession(
          req,
          HOMEY_SESSION_COOKIE_NAME,
          homeySessionStore
        );
        if (!context?.session.auth) {
          return null;
        }
        touchHomeyRecord(req, res, context);
        return context.session.auth;
      },
    },
    configureServer: registerMiddleware,
    configurePreviewServer: registerMiddleware,
  };
}
