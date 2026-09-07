import type { IncomingMessage } from 'node:http';
import { type PreviewServer, type ViteDevServer } from 'vite';
import {
  AUTH_COOKIE_NAME,
  createViteAuthRequestHandler,
  createViteAuthSessionStore,
  type HomeAssistantAuthData,
  resolveViteAuthenticatedPrincipal,
  resolveViteAuthSession,
  type ViteAuthenticatedPrincipal,
} from './vite-auth-session-store.ts';
import {
  createViteDashboardProfileRequestHandler,
  type ViteDashboardProfilePrincipal,
} from './vite-dashboard-profile-store.ts';
import { createViteChoreStoreRequestHandler } from './vite-chore-store.ts';
import { type ViteInstallationAuthority } from './vite-installation-authority.ts';

export function authSessionStorePlugin(installationAuthority: ViteInstallationAuthority) {
  const authSessionStore = createViteAuthSessionStore(
    undefined,
    undefined,
    installationAuthority.getCookieNames(AUTH_COOKIE_NAME)
  );
  const handleRequest = createViteAuthRequestHandler(
    authSessionStore,
    fetch,
    installationAuthority
  );

  const registerMiddleware = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use('/__navet_auth__', async (req, res) => {
      await handleRequest(req, res);
    });
  };

  return {
    name: 'navet-auth-session-store',
    api: {
      getAuthSession(req: IncomingMessage): HomeAssistantAuthData | null {
        return resolveViteAuthSession(req, authSessionStore)?.auth ?? null;
      },
      resolveAuthenticatedPrincipal(
        req: IncomingMessage,
        options?: { trustIngressHeaders?: boolean }
      ): ViteAuthenticatedPrincipal | null {
        return resolveViteAuthenticatedPrincipal(req, authSessionStore, options);
      },
    },
    configureServer: registerMiddleware,
    configurePreviewServer: registerMiddleware,
  };
}

export function dashboardProfileStorePlugin(
  installationAuthority: ViteInstallationAuthority,
  resolvePrincipal: (
    req: IncomingMessage
  ) => ViteDashboardProfilePrincipal | null | Promise<ViteDashboardProfilePrincipal | null>
) {
  const handleRequest = createViteDashboardProfileRequestHandler({
    cookieNames: installationAuthority.getCookieNames('navet_profile_client'),
    resolvePrincipal,
  });
  const registerMiddleware = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use('/__navet_profile__', async (req, res) => {
      await handleRequest(req, res);
    });
  };

  return {
    name: 'navet-dashboard-profile-store',
    configureServer: registerMiddleware,
    configurePreviewServer: registerMiddleware,
  };
}

export function choreStorePlugin(
  resolvePrincipal: (
    req: IncomingMessage
  ) => ViteDashboardProfilePrincipal | null | Promise<ViteDashboardProfilePrincipal | null>
) {
  const handleRequest = createViteChoreStoreRequestHandler({ resolvePrincipal });
  const registerMiddleware = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use('/__navet_chores__', async (req, res) => {
      await handleRequest(req, res);
    });
  };

  return {
    name: 'navet-chore-store',
    configureServer: registerMiddleware,
    configurePreviewServer: registerMiddleware,
  };
}
