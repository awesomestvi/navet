import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import type { build as EsbuildBuild } from 'esbuild';
import type { Plugin, PreviewServer, ViteDevServer } from 'vite';
import { isViteStrictSameOriginMutation } from './vite-provider-session-store.ts';

const NAVET_AI_PATH = '/__navet_ai__/';
const START_ATTEMPTS = 50;
const START_RETRY_MS = 100;

type ResolvePrincipal = (request: IncomingMessage) => unknown | null | Promise<unknown | null>;

export interface ViteNavetAiServiceOptions {
  repositoryRoot: string;
  resolvePrincipal: ResolvePrincipal;
  environment?: NodeJS.ProcessEnv;
  fetchImplementation?: typeof fetch;
  spawnImplementation?: typeof spawn;
  buildImplementation?: typeof EsbuildBuild;
}

interface NavetAiSourceWatcher {
  add(paths: string | readonly string[]): unknown;
  on(
    event: 'all',
    listener: (eventName: 'add' | 'change' | 'unlink', changedPath: string) => void
  ): unknown;
}

export function registerNavetAiServiceSourceWatcher(options: {
  repositoryRoot: string;
  watcher: NavetAiSourceWatcher;
  restart: () => void | Promise<void>;
}) {
  const watchedServiceDirectory = path.join(options.repositoryRoot, 'services', 'navet-ai');
  const watchedCoreFiles = new Set([
    path.join(options.repositoryRoot, 'packages/core/src/home-events.ts'),
    path.join(options.repositoryRoot, 'packages/core/src/intelligence.ts'),
    path.join(options.repositoryRoot, 'packages/core/src/intelligence-chat.ts'),
  ]);
  options.watcher.add([watchedServiceDirectory, ...watchedCoreFiles]);
  options.watcher.on('all', (_eventName, changedPath) => {
    const absoluteChangedPath = path.isAbsolute(changedPath)
      ? path.normalize(changedPath)
      : path.resolve(options.repositoryRoot, changedPath);
    if (
      absoluteChangedPath.startsWith(`${watchedServiceDirectory}${path.sep}`) ||
      watchedCoreFiles.has(absoluteChangedPath)
    ) {
      void options.restart();
    }
  });
}

function sendJson(response: ServerResponse, status: number, payload: unknown) {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json');
  response.setHeader('cache-control', 'no-store');
  response.end(JSON.stringify(payload));
}

function readRequestBody(request: IncomingMessage) {
  return new Promise<Buffer | undefined>((resolve, reject) => {
    if (request.method === 'GET' || request.method === 'HEAD') {
      resolve(undefined);
      return;
    }
    const chunks: Buffer[] = [];
    request.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    request.on('end', () => resolve(chunks.length > 0 ? Buffer.concat(chunks) : undefined));
    request.on('error', reject);
  });
}

export function createViteNavetAiProxyHandler(options: {
  resolvePrincipal: ResolvePrincipal;
  targetOrigin: string;
  ready: Promise<void> | (() => Promise<void>);
  fetchImplementation?: typeof fetch;
}) {
  const fetchImplementation = options.fetchImplementation ?? fetch;

  return async (request: IncomingMessage, response: ServerResponse) => {
    if (!(await options.resolvePrincipal(request))) {
      sendJson(response, 401, { error: 'Authenticated browser session is required' });
      return;
    }
    if (request.method !== 'GET' && !isViteStrictSameOriginMutation(request)) {
      sendJson(response, 403, { error: 'Same-origin request required' });
      return;
    }

    try {
      await (typeof options.ready === 'function' ? options.ready() : options.ready);
      const body = await readRequestBody(request);
      const upstream = await fetchImplementation(
        new URL(request.url ?? NAVET_AI_PATH, options.targetOrigin),
        {
          method: request.method,
          headers: body
            ? { 'content-type': request.headers['content-type'] ?? 'application/json' }
            : undefined,
          body: body ? new Uint8Array(body) : undefined,
        }
      );
      response.statusCode = upstream.status;
      response.setHeader('content-type', upstream.headers.get('content-type') ?? 'application/json');
      response.setHeader('cache-control', 'no-store');
      response.end(Buffer.from(await upstream.arrayBuffer()));
    } catch (error) {
      sendJson(response, 503, {
        error: 'The local smart features service is unavailable',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  };
}

export function viteNavetAiServicePlugin(options: ViteNavetAiServiceOptions): Plugin {
  const environment = options.environment ?? process.env;
  const servicePort = Number(environment.NAVET_AI_DEV_PORT || 18_098);
  const targetOrigin = `http://127.0.0.1:${servicePort}`;
  const dataDirectory =
    environment.NAVET_AI_DATA_DIRECTORY ||
    path.join(options.repositoryRoot, '.cache', 'navet-ai-dev');
  const bundlePath = path.join(dataDirectory, 'navet-ai-server.mjs');
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const spawnImplementation = options.spawnImplementation ?? spawn;
  let child: ChildProcess | null = null;
  let startPromise: Promise<void> | null = null;
  let restartPromise: Promise<void> | null = null;

  const start = () => {
    if (startPromise) return startPromise;
    startPromise = (async () => {
      mkdirSync(dataDirectory, { recursive: true });
      const buildImplementation =
        options.buildImplementation ?? (await import('esbuild')).build;
      await buildImplementation({
        entryPoints: [path.join(options.repositoryRoot, 'services/navet-ai/server.ts')],
        bundle: true,
        platform: 'node',
        format: 'esm',
        outfile: bundlePath,
        external: ['node:*'],
        logLevel: 'silent',
      });
      child = spawnImplementation(process.execPath, [bundlePath], {
        env: {
          ...environment,
          NAVET_AI_DATA_DIRECTORY: dataDirectory,
          NAVET_AI_PORT: String(servicePort),
        },
        stdio: ['ignore', 'ignore', 'pipe'],
      });
      let stderr = '';
      child.stderr?.on('data', (chunk) => {
        stderr += String(chunk);
      });

      for (let attempt = 0; attempt < START_ATTEMPTS; attempt += 1) {
        if (child.exitCode !== null) {
          throw new Error(stderr.trim() || `service exited with code ${child.exitCode}`);
        }
        try {
          const response = await fetchImplementation(`${targetOrigin}${NAVET_AI_PATH}capabilities`);
          if (response.ok) return;
        } catch {
          // The loopback service is still starting.
        }
        await new Promise((resolve) => setTimeout(resolve, START_RETRY_MS));
      }
      throw new Error(stderr.trim() || 'service startup timed out');
    })();
    return startPromise;
  };

  const stop = async () => {
    const activeChild = child;
    child = null;
    startPromise = null;
    if (!activeChild || activeChild.exitCode !== null) return;
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 1_000);
      activeChild.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
      activeChild.kill('SIGTERM');
    });
  };

  const restart = () => {
    if (restartPromise) return restartPromise;
    restartPromise = stop()
      .then(start)
      .finally(() => {
        restartPromise = null;
      });
    return restartPromise;
  };

  const register = (server: ViteDevServer | PreviewServer) => {
    void start();
    const handleRequest = createViteNavetAiProxyHandler({
      resolvePrincipal: options.resolvePrincipal,
      targetOrigin,
      ready: start,
      fetchImplementation,
    });
    server.middlewares.use(async (request, response, next) => {
      if (!request.url?.startsWith(NAVET_AI_PATH)) {
        next();
        return;
      }
      await handleRequest(request, response);
    });
    if ('watcher' in server) {
      registerNavetAiServiceSourceWatcher({
        repositoryRoot: options.repositoryRoot,
        watcher: server.watcher,
        restart,
      });
    }
    server.httpServer?.once('close', () => void stop());
  };

  return {
    name: 'navet-ai-local-service',
    configureServer: register,
    configurePreviewServer: register,
    closeBundle: () => void stop(),
  };
}
