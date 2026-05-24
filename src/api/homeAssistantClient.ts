import type { AuthData, Connection } from 'home-assistant-js-websocket';
import { Auth, createConnection, getAuth } from 'home-assistant-js-websocket';
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

async function resolveAuth(session: AuthSession): Promise<Auth> {
  if (session.auth) {
    session.auth.data.hassUrl = session.hassUrl;
    if (session.auth.expired) {
      await session.auth.refreshAccessToken();
    }
    return session.auth;
  }

  if (session.runtime === 'ha-ingress') {
    return createIngressProxyAuth(session.hassUrl);
  }

  return getAuth({ hassUrl: session.hassUrl });
}

export async function createHomeAssistantClient(
  session: AuthSession
): Promise<HomeAssistantClient> {
  const connectionUrl = resolveHomeAssistantConnectionUrl({
    runtime: session.runtime,
    hassUrl: session.hassUrl,
  });
  const auth = await resolveAuth({ ...session, hassUrl: connectionUrl });
  const connection = await createConnection({ auth, setupRetry: 3 });

  return { auth, connection };
}

export function getHomeAssistantBaseUrl(session: AuthSession | null): string | null {
  return session?.hassUrl ?? null;
}
