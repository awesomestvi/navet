import type { AuthData, Connection } from 'home-assistant-js-websocket';
import { Auth, createConnection, getAuth } from 'home-assistant-js-websocket';
import { getRuntimeContext } from '@/app/infrastructure/home-assistant/runtime/runtime-detector';
import { resolveHomeAssistantConnectionUrl } from '@/app/utils/home-assistant-connection-target';
import type { AuthSession } from '@/auth/types';

export interface HomeAssistantClient {
  auth: Auth;
  connection: Connection;
}

function createIngressProxyAuth(hassUrl: string): Auth {
  const data: AuthData = {
    hassUrl,
    clientId: null,
    expires: Date.now() + 3_600_000,
    refresh_token: '',
    access_token: 'ingress-proxy',
    expires_in: 3600,
  };

  return new Auth(data);
}

function createHostedProxyAuth(sourceAuth: Auth, hassUrl: string): Auth {
  const proxyAuth = new Auth({
    ...sourceAuth.data,
    hassUrl,
  });

  proxyAuth.refreshAccessToken = async () => {
    await sourceAuth.refreshAccessToken();
    proxyAuth.data = {
      ...sourceAuth.data,
      hassUrl,
    };
  };

  proxyAuth.revoke = async () => {
    await sourceAuth.revoke();
  };

  return proxyAuth;
}

async function resolveAuth(session: AuthSession): Promise<Auth> {
  const targetHassUrl = session.hassUrl;

  if (session.auth) {
    if (session.auth.expired) {
      try {
        await session.auth.refreshAccessToken();
      } catch (error) {
        if (session.runtime === 'ha-ingress') {
          return createIngressProxyAuth(targetHassUrl);
        }
        throw error;
      }
    }
    return targetHassUrl === session.auth.data.hassUrl
      ? session.auth
      : createHostedProxyAuth(session.auth, targetHassUrl);
  }

  if (session.runtime === 'ha-ingress') {
    return createIngressProxyAuth(targetHassUrl);
  }

  return getAuth({ hassUrl: session.haBaseUrl });
}

export async function createHomeAssistantClient(
  session: AuthSession
): Promise<HomeAssistantClient> {
  const connectionUrl = resolveHomeAssistantConnectionUrl({
    runtime: session.runtime,
    hassUrl: session.haBaseUrl,
  });
  const auth = await resolveAuth({ ...session, hassUrl: connectionUrl });
  const connection = await createConnection({ auth, setupRetry: 3 });

  return { auth, connection };
}

export function getHomeAssistantBaseUrl(session: AuthSession | null): string | null {
  return session?.haBaseUrl ?? getRuntimeContext().haBaseUrl ?? null;
}
