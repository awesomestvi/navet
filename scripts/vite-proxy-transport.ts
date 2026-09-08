import type { IncomingMessage, ServerResponse } from 'node:http';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { connect as connectNet } from 'node:net';
import { isIP } from 'node:net';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { connect as connectTls } from 'node:tls';
import { isViteStrictSameOriginMutation } from './vite-provider-session-store.ts';
import { setSecurityHeaders } from './vite-response-security.ts';

function isRecoverableProxyStreamError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const causeCode =
    typeof error.cause === 'object' && error.cause && 'code' in error.cause
      ? error.cause.code
      : null;

  return (
    error.name === 'AbortError' ||
    error.message === 'terminated' ||
    causeCode === 'UND_ERR_BODY_TIMEOUT' ||
    causeCode === 'UND_ERR_ABORTED'
  );
}

export async function pipeReadableStreamToResponse(
  body: NonNullable<Response['body']>,
  res: ServerResponse,
  options?: {
    req?: IncomingMessage;
    abortController?: AbortController;
  }
) {
  const source = Readable.fromWeb(body as unknown as Parameters<typeof Readable.fromWeb>[0]);
  const abortUpstream = () => {
    options?.abortController?.abort();
  };

  options?.req?.once('close', abortUpstream);
  res.once('close', abortUpstream);

  try {
    await pipeline(source, res);
  } catch (error) {
    if (!isRecoverableProxyStreamError(error)) {
      if (!res.destroyed) {
        res.destroy(error instanceof Error ? error : undefined);
      }
      return;
    }

    if (!res.destroyed) {
      res.destroy();
    }
  } finally {
    options?.req?.off('close', abortUpstream);
    res.off('close', abortUpstream);
  }
}

export async function proxyRawUpstreamStream(options: {
  req: IncomingMessage;
  res: ServerResponse;
  targetUrl: URL;
  headers: Headers;
}) {
  const { req, res, targetUrl, headers } = options;
  const requestImpl = targetUrl.protocol === 'https:' ? httpsRequest : httpRequest;

  await new Promise<void>((resolve, reject) => {
    const upstreamRequest = requestImpl(
      targetUrl,
      {
        method: req.method,
        headers: Object.fromEntries(headers.entries()),
      },
      (upstreamResponse) => {
        res.statusCode = upstreamResponse.statusCode ?? 502;
        setSecurityHeaders(res);

        const allowedResponseHeaders = new Set([
          'accept-ranges',
          'cache-control',
          'content-length',
          'content-range',
          'content-type',
          'etag',
          'last-modified',
        ]);
        for (const [headerName, headerValue] of Object.entries(upstreamResponse.headers)) {
          if (!allowedResponseHeaders.has(headerName.toLowerCase())) {
            continue;
          }
          if (headerValue == null) {
            continue;
          }

          if (Array.isArray(headerValue)) {
            res.setHeader(headerName, headerValue);
          } else {
            res.setHeader(headerName, headerValue);
          }
        }

        upstreamResponse.on('error', reject);
        res.on('close', () => upstreamResponse.destroy());
        upstreamResponse.pipe(res);
        upstreamResponse.on('end', resolve);
      }
    );

    upstreamRequest.on('error', reject);
    req.on('close', () => upstreamRequest.destroy());
    upstreamRequest.end();
  });
}

const proxyWebSocketResponseHeaderBlocklist = new Set([
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

export function sendProxyUpgradeError(
  socket: import('node:net').Socket,
  statusCode: number,
  message: string
) {
  socket.write(
    `HTTP/1.1 ${statusCode} ${message}\r\nConnection: close\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`
  );
  socket.destroy();
}

export function proxyCredentialedWebSocket(options: {
  authorization: string;
  head: Buffer;
  label: string;
  req: IncomingMessage;
  socket: import('node:net').Socket;
  targetUrl: URL;
}) {
  const { authorization, head, label, req, socket, targetUrl } = options;
  const isSecure = targetUrl.protocol === 'https:';
  if (!isSecure && targetUrl.protocol !== 'http:') {
    sendProxyUpgradeError(socket, 400, `Invalid ${label} websocket target`);
    return;
  }

  const hostname = targetUrl.hostname.replace(/^\[|\]$/g, '');
  const allowInsecureTls = /^(1|true|yes)$/i.test(
    process.env.NAVET_ALLOW_INSECURE_PROVIDER_TLS ?? ''
  );
  const upstreamSocket = isSecure
    ? connectTls({
        host: hostname,
        port: targetUrl.port ? Number(targetUrl.port) : 443,
        rejectUnauthorized: !allowInsecureTls,
        ...(isIP(hostname) === 0 ? { servername: hostname } : {}),
      })
    : connectNet({
        host: hostname,
        port: targetUrl.port ? Number(targetUrl.port) : 80,
      });

  let responseStarted = false;
  let handshakeBuffer = Buffer.alloc(0);
  upstreamSocket.on(isSecure ? 'secureConnect' : 'connect', () => {
    const forwardedHeaders = [
      `Host: ${targetUrl.host}`,
      `Authorization: ${authorization}`,
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
    if (head.byteLength > 0) {
      upstreamSocket.write(head);
    }
  });

  const handleHandshakeData = (chunk: Buffer) => {
    handshakeBuffer = Buffer.concat([handshakeBuffer, chunk]);
    if (handshakeBuffer.byteLength > 16 * 1024) {
      upstreamSocket.destroy();
      sendProxyUpgradeError(socket, 502, `Invalid ${label} websocket response`);
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
      sendProxyUpgradeError(socket, 502, `${label} websocket upgrade failed`);
      return;
    }
    const sanitizedHeaders = headerLines.slice(1).filter((line) => {
      const headerSeparator = line.indexOf(':');
      return (
        headerSeparator > 0 &&
        !proxyWebSocketResponseHeaderBlocklist.has(
          line.slice(0, headerSeparator).trim().toLowerCase()
        )
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
      sendProxyUpgradeError(socket, 502, `Unable to connect to ${label} websocket`);
    } else {
      socket.destroy();
    }
  });
  socket.on('error', () => upstreamSocket.destroy());
  socket.on('close', () => upstreamSocket.destroy());
}

export function isCredentialProxyRequestAllowed(req: IncomingMessage, websocket = false) {
  const method = (req.method ?? 'GET').toUpperCase();
  const upgraded =
    websocket ||
    Boolean(String(req.headers.upgrade ?? '').trim()) ||
    String(req.headers.connection ?? '')
      .toLowerCase()
      .split(',')
      .some((token) => token.trim() === 'upgrade');
  return (
    (!upgraded && (method === 'GET' || method === 'HEAD')) || isViteStrictSameOriginMutation(req)
  );
}
