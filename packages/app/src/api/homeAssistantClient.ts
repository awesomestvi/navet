import type { HomeAssistantAuthSession } from '@navet/app/auth/types';
import { getRuntimeContext } from '@navet/app/infrastructure/home-assistant/runtime/runtime-detector';
import { resolveHomeAssistantConnectionUrl } from '@navet/app/utils/home-assistant-connection-target';
import type { Connection } from 'home-assistant-js-websocket';
import { Auth, createConnection, getAuth } from 'home-assistant-js-websocket';

export interface HomeAssistantClient {
  auth: Auth;
  connection: Connection;
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

async function resolveAuth(session: HomeAssistantAuthSession): Promise<Auth> {
  const targetHassUrl = session.hassUrl;

  if (session.auth) {
    if (session.auth.expired) {
      await session.auth.refreshAccessToken();
    }
    return targetHassUrl === session.auth.data.hassUrl
      ? session.auth
      : createHostedProxyAuth(session.auth, targetHassUrl);
  }

  return getAuth({ hassUrl: session.haBaseUrl });
}

export async function createHomeAssistantClient(
  session: HomeAssistantAuthSession
): Promise<HomeAssistantClient> {
  if (session.runtime === 'ha-ingress') {
    throw new Error(
      'Home Assistant ingress sessions must use the parent Home Assistant runtime bridge'
    );
  }

  const connectionUrl = resolveHomeAssistantConnectionUrl({
    runtime: session.runtime,
    hassUrl: session.haBaseUrl,
  });
  const auth = await resolveAuth({ ...session, hassUrl: connectionUrl });
  const connection = await createConnection({ auth, setupRetry: 3 });

  return { auth, connection };
}

export function getHomeAssistantBaseUrl(session: HomeAssistantAuthSession | null): string | null {
  return session?.haBaseUrl ?? getRuntimeContext().haBaseUrl ?? null;
}
