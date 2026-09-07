import type { IncomingMessage, ServerResponse } from 'node:http';
import { connect as connectNet } from 'node:net';
import { isIP } from 'node:net';
import { connect as connectTls } from 'node:tls';
import { type PreviewServer, type ViteDevServer } from 'vite';
import { type HomeAssistantAuthData } from './vite-auth-session-store.ts';
import { normalizeViteProxyTargetPath } from './vite-proxy-path.ts';
import { type HomeySessionData } from './vite-homey-session-store.ts';
import {
  type OpenHABSessionData,
  normalizeOpenHABBaseUrl,
  toOpenHABBasicAuthHeader,
} from './vite-openhab-session-store.ts';
import { isViteStrictSameOriginMutation } from './vite-provider-session-store.ts';
import {
  buildHomeAssistantProxyRequestHeaders,
  isHomeAssistantOAuthProxyBodyRequest,
} from './vite-proxy-request-headers.ts';
import {
  isCredentialProxyRequestAllowed,
  pipeReadableStreamToResponse,
  proxyCredentialedWebSocket,
  proxyRawUpstreamStream,
  sendProxyUpgradeError,
} from './vite-proxy-transport.ts';
import { setSecurityHeaders } from './vite-response-security.ts';
import { OPENHAB_SESSION_MAX_BYTES } from './vite-openhab-session-plugin.ts';

const HOME_ASSISTANT_OAUTH_BODY_MAX_BYTES = 16 * 1024;
export function homeAssistantProxyPlugin(
  getAuthSession: (req: IncomingMessage) => HomeAssistantAuthData | null
) {
  const proxyBasePath = '/__navet_ha_proxy__';
  const websocketPath = `${proxyBasePath}/api/websocket`;
  const handleUpgrade = (req: IncomingMessage, socket: import('node:net').Socket, head: Buffer) => {
    const rawUrl = String(req.url ?? '');
    const separator = rawUrl.indexOf('?');
    const pathname = separator === -1 ? rawUrl : rawUrl.slice(0, separator);
    const query = separator === -1 ? '' : rawUrl.slice(separator + 1);
    if (!pathname.startsWith(proxyBasePath)) {
      return;
    }
    if (
      pathname !== websocketPath ||
      query ||
      req.method !== 'GET' ||
      String(req.headers.upgrade ?? '').toLowerCase() !== 'websocket' ||
      !String(req.headers.connection ?? '')
        .toLowerCase()
        .split(',')
        .some((token) => token.trim() === 'upgrade') ||
      !isCredentialProxyRequestAllowed(req, true)
    ) {
      sendProxyUpgradeError(socket, 403, 'Forbidden Home Assistant websocket request');
      return;
    }

    const authSession = getAuthSession(req);
    if (!authSession?.hassUrl || !authSession.access_token) {
      sendProxyUpgradeError(socket, 502, 'Home Assistant OAuth session is required');
      return;
    }
    try {
      const targetUrl = new URL(`${authSession.hassUrl.replace(/\/+$/, '')}/api/websocket`);
      proxyCredentialedWebSocket({
        authorization: `Bearer ${authSession.access_token}`,
        head,
        label: 'Home Assistant',
        req,
        socket,
        targetUrl,
      });
    } catch {
      sendProxyUpgradeError(socket, 400, 'Invalid Home Assistant websocket target');
    }
  };

  const registerUpgradeProxy = (server: ViteDevServer | PreviewServer) => {
    server.httpServer?.on('upgrade', (req, socket, head) => {
      handleUpgrade(req, socket, head);
    });
  };

  const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.statusCode = 400;
      res.end('Missing proxy path');
      return;
    }
    if (!isCredentialProxyRequestAllowed(req)) {
      res.statusCode = 403;
      res.end('Forbidden Home Assistant proxy request');
      return;
    }

    try {
      let decodedUrl = '';
      try {
        decodedUrl = decodeURIComponent(req.url);
      } catch {
        res.statusCode = 400;
        res.end('Invalid proxy path');
        return;
      }

      if (req.url.includes('..') || decodedUrl.includes('..')) {
        res.statusCode = 400;
        res.end('Invalid proxy path');
        return;
      }

      const authSession = getAuthSession(req);
      if (!authSession?.hassUrl) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Home Assistant OAuth session is required' }));
        return;
      }

      const upstreamBaseUrl = authSession.hassUrl;
      const upstreamOrigin = new URL(upstreamBaseUrl);
      const targetPath = normalizeViteProxyTargetPath(proxyBasePath, req.url);
      const targetUrl = new URL(`${upstreamBaseUrl.replace(/\/+$/, '')}${targetPath}`);
      if (targetUrl.origin !== upstreamOrigin.origin) {
        res.statusCode = 400;
        res.end('Invalid proxy target');
        return;
      }

      const forwardsOAuthBody = isHomeAssistantOAuthProxyBodyRequest(req.method, targetPath);
      const headers = buildHomeAssistantProxyRequestHeaders(req.headers, authSession.access_token, {
        forwardContentType: forwardsOAuthBody,
        includeAuthorization: !forwardsOAuthBody,
      });
      let body: Uint8Array<ArrayBuffer> | undefined;
      if (forwardsOAuthBody) {
        const contentType = headers.get('content-type')?.toLowerCase() ?? '';
        if (
          !contentType.startsWith('multipart/form-data;') &&
          contentType !== 'application/x-www-form-urlencoded'
        ) {
          res.statusCode = 415;
          res.end('Unsupported Home Assistant OAuth request content type');
          return;
        }

        const declaredLength = Number.parseInt(String(req.headers['content-length'] ?? ''), 10);
        if (
          Number.isFinite(declaredLength) &&
          declaredLength > HOME_ASSISTANT_OAUTH_BODY_MAX_BYTES
        ) {
          res.statusCode = 413;
          res.end('Home Assistant OAuth request is too large');
          return;
        }

        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of req) {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          size += buffer.byteLength;
          if (size > HOME_ASSISTANT_OAUTH_BODY_MAX_BYTES) {
            res.statusCode = 413;
            res.end('Home Assistant OAuth request is too large');
            return;
          }
          chunks.push(buffer);
        }
        const payload = Buffer.concat(chunks);
        body = new Uint8Array(payload.byteLength);
        body.set(payload);
      }

      const abortController = new AbortController();
      const isRawCameraStream = targetPath.startsWith('/api/camera_proxy_stream/');

      if (isRawCameraStream) {
        await proxyRawUpstreamStream({
          req,
          res,
          targetUrl,
          headers,
        });
        return;
      }

      const upstreamResponse = await fetch(targetUrl, {
        method: req.method,
        redirect: 'manual',
        headers,
        body,
        signal: abortController.signal,
      });

      res.statusCode = upstreamResponse.status;
      setSecurityHeaders(res);

      const contentType = upstreamResponse.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }

      const cacheControl = upstreamResponse.headers.get('cache-control');
      if (cacheControl) {
        res.setHeader('Cache-Control', cacheControl);
      }

      if (!upstreamResponse.body) {
        res.end();
        return;
      }

      await pipeReadableStreamToResponse(upstreamResponse.body, res, { req, abortController });
    } catch {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Unable to load Home Assistant resource' }));
    }
  };

  return {
    name: 'navet-ha-proxy',
    configureServer(server: ViteDevServer) {
      registerUpgradeProxy(server);
      server.middlewares.use('/__navet_ha_proxy__', async (req, res) => {
        await handleRequest(req, res);
      });
    },
    configurePreviewServer(server: PreviewServer) {
      registerUpgradeProxy(server);
      server.middlewares.use('/__navet_ha_proxy__', async (req, res) => {
        await handleRequest(req, res);
      });
    },
  };
}

export function homeyProxyPlugin(
  getHomeySession: (req: IncomingMessage, res?: ServerResponse) => HomeySessionData | null
) {
  const proxyBasePath = '/__navet_homey_proxy__';
  const handleUpgrade = (req: IncomingMessage, socket: import('node:net').Socket, head: Buffer) => {
    if (!req.url?.startsWith(proxyBasePath)) {
      return;
    }
    if (
      req.method !== 'GET' ||
      String(req.headers.upgrade ?? '').toLowerCase() !== 'websocket' ||
      !String(req.headers.connection ?? '')
        .toLowerCase()
        .split(',')
        .some((token) => token.trim() === 'upgrade') ||
      !isCredentialProxyRequestAllowed(req, true)
    ) {
      sendProxyUpgradeError(socket, 403, 'Forbidden Homey websocket request');
      return;
    }

    let decodedUrl = '';
    try {
      decodedUrl = decodeURIComponent(req.url);
    } catch {
      sendProxyUpgradeError(socket, 400, 'Invalid Homey websocket path');
      return;
    }
    if (req.url.includes('..') || decodedUrl.includes('..')) {
      sendProxyUpgradeError(socket, 400, 'Invalid Homey websocket path');
      return;
    }

    const session = getHomeySession(req);
    if (!session?.homeyBaseUrl || !session.homeySessionToken) {
      sendProxyUpgradeError(socket, 502, 'Homey OAuth session is required');
      return;
    }
    try {
      const upstreamOrigin = new URL(session.homeyBaseUrl);
      const targetPath = normalizeViteProxyTargetPath(proxyBasePath, req.url);
      const targetUrl = new URL(`${session.homeyBaseUrl.replace(/\/+$/, '')}${targetPath}`);
      if (targetUrl.origin !== upstreamOrigin.origin) {
        throw new Error('Invalid proxy target');
      }
      proxyCredentialedWebSocket({
        authorization: `Bearer ${session.homeySessionToken}`,
        head,
        label: 'Homey',
        req,
        socket,
        targetUrl,
      });
    } catch {
      sendProxyUpgradeError(socket, 400, 'Invalid Homey websocket target');
    }
  };

  const registerUpgradeProxy = (server: ViteDevServer | PreviewServer) => {
    server.httpServer?.on('upgrade', (req, socket, head) => {
      handleUpgrade(req, socket, head);
    });
  };

  const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.statusCode = 400;
      res.end('Missing proxy path');
      return;
    }
    if (!isCredentialProxyRequestAllowed(req)) {
      res.statusCode = 403;
      res.end('Forbidden Homey proxy request');
      return;
    }

    try {
      let decodedUrl = '';
      try {
        decodedUrl = decodeURIComponent(req.url);
      } catch {
        res.statusCode = 400;
        res.end('Invalid proxy path');
        return;
      }

      if (req.url.includes('..') || decodedUrl.includes('..')) {
        res.statusCode = 400;
        res.end('Invalid proxy path');
        return;
      }

      const session = getHomeySession(req, res);
      const upstreamBaseUrl = session?.homeyBaseUrl ?? null;
      const sessionToken = session?.homeySessionToken ?? null;
      if (!upstreamBaseUrl || !sessionToken) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Homey OAuth session is required' }));
        return;
      }

      const upstreamOrigin = new URL(upstreamBaseUrl);
      const targetPath = normalizeViteProxyTargetPath(proxyBasePath, req.url);
      const targetUrl = new URL(`${upstreamBaseUrl.replace(/\/+$/, '')}${targetPath}`);
      if (targetUrl.origin !== upstreamOrigin.origin) {
        res.statusCode = 400;
        res.end('Invalid proxy target');
        return;
      }

      const headers = new Headers();
      const contentType =
        typeof req.headers['content-type'] === 'string' ? req.headers['content-type'] : null;
      const accept = typeof req.headers.accept === 'string' ? req.headers.accept : null;
      if (contentType) {
        headers.set('Content-Type', contentType);
      }
      if (accept) {
        headers.set('Accept', accept);
      }
      headers.set('Authorization', `Bearer ${sessionToken}`);

      const body =
        req.method === 'GET' || req.method === 'HEAD'
          ? undefined
          : await new Response(req as never).text();

      const abortController = new AbortController();

      const upstreamResponse = await fetch(targetUrl, {
        method: req.method,
        redirect: 'manual',
        headers,
        body,
        signal: abortController.signal,
      });

      res.statusCode = upstreamResponse.status;
      setSecurityHeaders(res);
      const responseContentType = upstreamResponse.headers.get('content-type');
      if (responseContentType) {
        res.setHeader('Content-Type', responseContentType);
      }

      if (!upstreamResponse.body) {
        res.end();
        return;
      }

      await pipeReadableStreamToResponse(upstreamResponse.body, res, { req, abortController });
    } catch {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Unable to load Homey resource' }));
    }
  };

  return {
    name: 'navet-homey-proxy',
    configureServer(server: ViteDevServer) {
      registerUpgradeProxy(server);
      server.middlewares.use('/__navet_homey_proxy__', async (req, res) => {
        await handleRequest(req, res);
      });
    },
    configurePreviewServer(server: PreviewServer) {
      registerUpgradeProxy(server);
      server.middlewares.use('/__navet_homey_proxy__', async (req, res) => {
        await handleRequest(req, res);
      });
    },
  };
}

export function openhabProxyPlugin(
  getOpenHABSession: (req: IncomingMessage, res?: ServerResponse) => OpenHABSessionData | null
) {
  const proxyBasePath = '/__navet_openhab_proxy__';
  const maxWebSocketHandshakeBytes = 16 * 1024;
  const sendUpgradeError = (
    socket: import('node:net').Socket,
    statusCode: number,
    message: string
  ) => {
    socket.write(
      `HTTP/1.1 ${statusCode} ${message}\r\nConnection: close\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`
    );
    socket.destroy();
  };

  const resolveAllowedSuffix = (req: IncomingMessage, websocket: boolean) => {
    const requestUrl = String(req.url ?? '');
    const separator = requestUrl.indexOf('?');
    const rawPath = separator === -1 ? requestUrl : requestUrl.slice(0, separator);
    const query = separator === -1 ? '' : requestUrl.slice(separator + 1);
    if (!rawPath.startsWith(proxyBasePath) || /%25/i.test(rawPath)) {
      return '';
    }

    let pathname = '';
    try {
      pathname = decodeURIComponent(rawPath);
    } catch {
      return '';
    }
    if (pathname.includes('..') || pathname.includes('\\')) {
      return '';
    }

    const suffix = pathname.slice(proxyBasePath.length) || '/';
    if (websocket) {
      return req.method === 'GET' &&
        suffix === '/ws' &&
        !query &&
        isViteStrictSameOriginMutation(req) &&
        String(req.headers.upgrade ?? '').toLowerCase() === 'websocket' &&
        String(req.headers.connection ?? '')
          .toLowerCase()
          .split(',')
          .some((token) => token.trim() === 'upgrade')
        ? '/ws'
        : '';
    }

    if (req.method === 'GET' && suffix === '/rest/items' && query === 'recursive=false') {
      return '/rest/items?recursive=false';
    }
    if (
      req.method === 'POST' &&
      /^\/rest\/items\/[A-Za-z0-9_]+$/.test(suffix) &&
      !query &&
      isViteStrictSameOriginMutation(req)
    ) {
      return suffix;
    }
    return '';
  };

  const resolveOpenHABTargetUrl = (suffix: string, session: OpenHABSessionData) => {
    const baseUrl = normalizeOpenHABBaseUrl(session.hassUrl);
    if (!baseUrl || !suffix) {
      throw new Error('Invalid proxy target');
    }
    return new URL(`${baseUrl}${suffix}`);
  };

  const handleUpgrade = (req: IncomingMessage, socket: import('node:net').Socket, head: Buffer) => {
    if (!req.url?.startsWith(proxyBasePath)) {
      return;
    }

    const suffix = resolveAllowedSuffix(req, true);
    if (!suffix) {
      sendUpgradeError(socket, 403, 'Forbidden openHAB websocket request');
      return;
    }

    const session = getOpenHABSession(req);
    if (!session) {
      sendUpgradeError(socket, 502, 'openHAB session is required');
      return;
    }

    let targetUrl: URL;
    try {
      targetUrl = resolveOpenHABTargetUrl(suffix, session);
    } catch {
      sendUpgradeError(socket, 400, 'Invalid proxy target');
      return;
    }

    targetUrl.protocol = targetUrl.protocol === 'https:' ? 'wss:' : 'ws:';

    const isSecureWebSocket = targetUrl.protocol === 'wss:';
    const upstreamHostname = targetUrl.hostname.replace(/^\[|\]$/g, '');
    const upstreamSocket = isSecureWebSocket
      ? connectTls({
          host: upstreamHostname,
          port: targetUrl.port ? Number(targetUrl.port) : 443,
          rejectUnauthorized: !/^(1|true|yes)$/i.test(
            process.env.NAVET_ALLOW_INSECURE_PROVIDER_TLS ?? ''
          ),
          ...(isIP(upstreamHostname) === 0 ? { servername: upstreamHostname } : {}),
        })
      : connectNet({
          host: upstreamHostname,
          port: targetUrl.port ? Number(targetUrl.port) : 80,
        });

    let responseStarted = false;
    let handshakeBuffer = Buffer.alloc(0);

    upstreamSocket.on(isSecureWebSocket ? 'secureConnect' : 'connect', () => {
      const forwardedHeaders = [
        `Host: ${targetUrl.host}`,
        `Authorization: ${toOpenHABBasicAuthHeader(session)}`,
        'Upgrade: websocket',
        'Connection: Upgrade',
      ];
      for (const headerName of [
        'sec-websocket-key',
        'sec-websocket-version',
        'sec-websocket-protocol',
        'sec-websocket-extensions',
      ]) {
        const value = req.headers[headerName];
        if (typeof value === 'string' && value) {
          forwardedHeaders.push(`${headerName}: ${value}`);
        }
      }

      upstreamSocket.write(
        [`GET ${targetUrl.pathname}${targetUrl.search} HTTP/1.1`, ...forwardedHeaders, '', ''].join(
          '\r\n'
        )
      );

      if (head.length > 0) {
        upstreamSocket.write(head);
      }
    });

    const handleHandshakeData = (chunk: Buffer) => {
      handshakeBuffer = Buffer.concat([handshakeBuffer, chunk]);
      if (handshakeBuffer.byteLength > maxWebSocketHandshakeBytes) {
        upstreamSocket.destroy();
        sendUpgradeError(socket, 502, 'Invalid openHAB websocket response');
        return;
      }

      const separator = handshakeBuffer.indexOf('\r\n\r\n');
      if (separator === -1) {
        return;
      }
      upstreamSocket.off('data', handleHandshakeData);
      const headerLines = handshakeBuffer.subarray(0, separator).toString('latin1').split('\r\n');
      if (!/^HTTP\/1\.[01] 101\b/.test(headerLines[0] ?? '')) {
        upstreamSocket.destroy();
        sendUpgradeError(socket, 502, 'openHAB websocket upgrade failed');
        return;
      }

      const blockedResponseHeaders = new Set([
        'access-control-allow-credentials',
        'access-control-allow-headers',
        'access-control-allow-methods',
        'access-control-allow-origin',
        'access-control-expose-headers',
        'access-control-max-age',
        'location',
        'set-cookie',
        'www-authenticate',
        'x-accel-buffering',
        'x-accel-charset',
        'x-accel-expires',
        'x-accel-limit-rate',
        'x-accel-redirect',
      ]);
      const sanitizedHeaders = headerLines.slice(1).filter((line) => {
        const headerSeparator = line.indexOf(':');
        return (
          headerSeparator > 0 &&
          !blockedResponseHeaders.has(line.slice(0, headerSeparator).trim().toLowerCase())
        );
      });

      responseStarted = true;
      socket.write([headerLines[0], ...sanitizedHeaders, '', ''].join('\r\n'));
      const remainder = handshakeBuffer.subarray(separator + 4);
      if (remainder.byteLength > 0) {
        socket.write(remainder);
      }
      upstreamSocket.pipe(socket);
      socket.pipe(upstreamSocket);
    };
    upstreamSocket.on('data', handleHandshakeData);

    upstreamSocket.on('error', () => {
      if (!responseStarted) {
        sendUpgradeError(socket, 502, 'Unable to connect to openHAB websocket');
      } else {
        socket.destroy();
      }
    });

    socket.on('error', () => {
      upstreamSocket.destroy();
    });

    socket.on('close', () => {
      upstreamSocket.destroy();
    });
  };

  const handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.statusCode = 400;
      res.end('Missing proxy path');
      return;
    }

    try {
      const suffix = resolveAllowedSuffix(req, false);
      if (!suffix) {
        res.statusCode = 403;
        res.end('Forbidden openHAB proxy request');
        return;
      }

      const session = getOpenHABSession(req, res);
      if (!session) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'openHAB session is required' }));
        return;
      }

      const targetUrl = resolveOpenHABTargetUrl(suffix, session);

      const headers = new Headers();
      const contentType =
        typeof req.headers['content-type'] === 'string' ? req.headers['content-type'] : null;
      const accept = typeof req.headers.accept === 'string' ? req.headers.accept : null;
      if (contentType) {
        headers.set('Content-Type', contentType);
      }
      if (accept) {
        headers.set('Accept', accept);
      } else {
        headers.set('Accept', 'application/json');
      }
      headers.set('Authorization', toOpenHABBasicAuthHeader(session));

      let body: string | undefined;
      if (req.method === 'POST') {
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of req) {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          size += buffer.byteLength;
          if (size > OPENHAB_SESSION_MAX_BYTES) {
            res.statusCode = 413;
            res.end('openHAB command is too large');
            return;
          }
          chunks.push(buffer);
        }
        body = Buffer.concat(chunks).toString('utf8');
      }

      const abortController = new AbortController();

      const upstreamResponse = await fetch(targetUrl, {
        method: req.method,
        redirect: 'manual',
        headers,
        body,
        signal: abortController.signal,
      });

      res.statusCode = upstreamResponse.status;
      setSecurityHeaders(res);
      const responseContentType = upstreamResponse.headers.get('content-type');
      if (responseContentType) {
        res.setHeader('Content-Type', responseContentType);
      }

      if (!upstreamResponse.body) {
        res.end();
        return;
      }

      await pipeReadableStreamToResponse(upstreamResponse.body, res, { req, abortController });
    } catch {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Unable to load openHAB resource' }));
    }
  };

  const registerUpgradeProxy = (server: ViteDevServer | PreviewServer) => {
    server.httpServer?.on('upgrade', (req, socket, head) => {
      handleUpgrade(req, socket, head);
    });
  };

  return {
    name: 'navet-openhab-proxy',
    configureServer(server: ViteDevServer) {
      registerUpgradeProxy(server);
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith(proxyBasePath)) {
          next();
          return;
        }
        await handleRequest(req, res);
      });
    },
    configurePreviewServer(server: PreviewServer) {
      registerUpgradeProxy(server);
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith(proxyBasePath)) {
          next();
          return;
        }
        await handleRequest(req, res);
      });
    },
  };
}
