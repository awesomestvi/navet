import type { IncomingMessage, ServerResponse } from 'node:http';
import { type PreviewServer, type ViteDevServer } from 'vite';
import { type ViteInstallationAuthority } from './vite-installation-authority.ts';
import type { ViteDeviceSessionAuthority } from './vite-device-session-authority.ts';
import {
  createViteOpenHABSessionStore,
  OPENHAB_SESSION_COOKIE_NAME as OPENHAB_SESSION_COOKIE_BASE_NAME,
  type OpenHABSessionData,
  normalizeOpenHABBaseUrl,
  normalizeOpenHABSessionData,
  toOpenHABBasicAuthHeader,
  type ViteStoredOpenHABSession,
} from './vite-openhab-session-store.ts';
import { createViteOpenHABLoginRateLimiter } from './vite-openhab-login-rate-limiter.ts';
import {
  clearViteProviderSessionCookie,
  deleteViteProviderRequestSessions,
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

export const OPENHAB_SESSION_MAX_BYTES = 8 * 1024;
export function openhabSessionStorePlugin(
  installationAuthority: ViteInstallationAuthority,
  deviceSessionAuthority?: ViteDeviceSessionAuthority
) {
  const OPENHAB_SESSION_COOKIE_NAME = installationAuthority.getCookieNames(
    OPENHAB_SESSION_COOKIE_BASE_NAME
  );
  const openhabSessionStore = createViteOpenHABSessionStore({
    cookieNames: OPENHAB_SESSION_COOKIE_NAME,
    deviceSessionAuthority,
  });
  const setOpenHABSessionCookie = (
    req: IncomingMessage,
    res: ServerResponse,
    cookieId: string
  ) => {
    if (!deviceSessionAuthority?.isDelegatedRequest(req, 'openhab')) {
      setViteProviderSessionCookie(req, res, OPENHAB_SESSION_COOKIE_NAME, cookieId);
    }
  };
  const loginRateLimiter = createViteOpenHABLoginRateLimiter();
  const OPENHAB_VALIDATE_TIMEOUT_MS = 5_000;
  const sessionTouchIntervalMs = 24 * 60 * 60 * 1000;
  const openHABValidationError = 'Unable to verify the openHAB connection';

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

  const readRequestBody = async (req: IncomingMessage) => {
    const chunks: Buffer[] = [];
    let size = 0;

    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.byteLength;
      if (size > OPENHAB_SESSION_MAX_BYTES) {
        throw new Error('openHAB session is too large');
      }
      chunks.push(buffer);
    }

    return Buffer.concat(chunks).toString('utf8');
  };

  const validateOpenHABSession = async (session: OpenHABSessionData) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OPENHAB_VALIDATE_TIMEOUT_MS);

    try {
      const normalizedBaseUrl = normalizeOpenHABBaseUrl(session.hassUrl);
      if (!normalizedBaseUrl) {
        throw new Error(openHABValidationError);
      }
      const targetUrl = new URL(`${normalizedBaseUrl}/rest/items?recursive=false&limit=1`);
      const response = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          Accept: 'application/json',
          Authorization: toOpenHABBasicAuthHeader(session),
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(openHABValidationError);
      }
      const payload: unknown = await response.json();
      if (!Array.isArray(payload)) {
        throw new Error(openHABValidationError);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(openHABValidationError);
      }
      throw new Error(openHABValidationError);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === 'GET') {
      const context = getViteProviderRequestSession(
        req,
        OPENHAB_SESSION_COOKIE_NAME,
        openhabSessionStore
      );
      if (!context?.session.auth) {
        sendNoContent(res);
        return;
      }

      if (context.session.updatedAt + sessionTouchIntervalMs < Date.now()) {
        openhabSessionStore.writeSession(context.cookieId, {
          ...context.session,
          updatedAt: Date.now(),
        });
      }
      setOpenHABSessionCookie(req, res, context.cookieId);
      sendJson(res, 200, {
        authenticated: true,
        hassUrl: context.session.auth.hassUrl,
      });
      return;
    }

    if (req.method === 'PUT') {
      const context = getViteProviderRequestSession(
        req,
        OPENHAB_SESSION_COOKIE_NAME,
        openhabSessionStore
      );
      if (!isViteStrictSameOriginMutation(req)) {
        sendJson(res, 403, { error: 'Cross-origin session mutation is not allowed' });
        return;
      }

      try {
        const body = await readRequestBody(req);
        const parsed = normalizeOpenHABSessionData(JSON.parse(body));
        if (!parsed) {
          sendJson(res, 400, { error: 'Unsupported openHAB session' });
          return;
        }
        const installationAuthorization = installationAuthority.authorizeOpenHAB(
          req,
          parsed.hassUrl,
          normalizeOpenHABBaseUrl
        );
        if (!installationAuthorization.allowed) {
          sendJson(res, 403, {
            error: 'openHAB target is not authorized for this installation',
          });
          return;
        }
        const rateLimit = loginRateLimiter.consume(req);
        if (!rateLimit.allowed) {
          res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
          sendJson(res, 429, {
            error: 'Too many openHAB login attempts. Try again later.',
          });
          return;
        }

        await validateOpenHABSession(parsed);
        if (context) {
          const current = openhabSessionStore.readSession(context.cookieId);
          if (!current || JSON.stringify(current) !== JSON.stringify(context.session)) {
            sendJson(res, 409, {
              error: 'openHAB session changed before login completed',
            });
            return;
          }
        }
        if (
          !installationAuthority.commitOpenHAB(
            parsed.hassUrl,
            normalizeOpenHABBaseUrl,
            installationAuthorization.pairingVerified
          )
        ) {
          sendJson(res, 403, {
            error: 'openHAB target is not authorized for this installation',
          });
          return;
        }
        const now = Date.now();
        const next: ViteStoredOpenHABSession = {
          version: 1,
          createdAt: now,
          updatedAt: now,
          auth: parsed,
        };
        rotateViteProviderRequestSession(
          req,
          res,
          OPENHAB_SESSION_COOKIE_NAME,
          openhabSessionStore,
          context?.cookieId ?? '',
          next
        );
        loginRateLimiter.reset(req);
        sendJson(res, 200, {
          authenticated: true,
          hassUrl: parsed.hassUrl,
        });
      } catch (error) {
        if (sendSessionStoreError(res, error)) {
          loginRateLimiter.reset(req);
          return;
        }
        sendJson(res, 400, { error: openHABValidationError });
      }
      return;
    }

    if (req.method === 'DELETE') {
      const context = getViteProviderRequestSession(
        req,
        OPENHAB_SESSION_COOKIE_NAME,
        openhabSessionStore
      );
      if (!context) {
        sendJson(res, 401, { error: 'Bound browser session is required' });
        return;
      }
      if (!isViteStrictSameOriginMutation(req)) {
        sendJson(res, 403, { error: 'Cross-origin session mutation is not allowed' });
        return;
      }

      clearViteProviderSessionCookie(req, res, OPENHAB_SESSION_COOKIE_NAME, openhabSessionStore);
      deleteViteProviderRequestSessions(req, OPENHAB_SESSION_COOKIE_NAME, openhabSessionStore);
      sendJson(res, 200, { ok: true });
      return;
    }

    res.setHeader('Allow', 'GET, PUT, DELETE');
    sendJson(res, 405, { error: 'Method not allowed' });
  };

  const registerMiddleware = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use('/__navet_openhab__/session', async (req, res) => {
      await handleRequest(req, res);
    });
  };

  return {
    name: 'navet-openhab-session-store',
    api: {
      getOpenHABSession(req: IncomingMessage, res?: ServerResponse): OpenHABSessionData | null {
        const context = getViteProviderRequestSession(
          req,
          OPENHAB_SESSION_COOKIE_NAME,
          openhabSessionStore
        );
        if (!context?.session.auth) {
          return null;
        }
        if (context.session.updatedAt + sessionTouchIntervalMs < Date.now()) {
          openhabSessionStore.writeSession(context.cookieId, {
            ...context.session,
            updatedAt: Date.now(),
          });
        }
        if (res) {
          setOpenHABSessionCookie(req, res, context.cookieId);
        }
        return context.session.auth;
      },
    },
    configureServer: registerMiddleware,
    configurePreviewServer: registerMiddleware,
  };
}
