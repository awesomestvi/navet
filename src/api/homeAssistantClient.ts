import type { Auth, Connection } from 'home-assistant-js-websocket';
import { createConnection, getAuth } from 'home-assistant-js-websocket';
import { resolveHomeAssistantConnectionUrl } from '@/app/utils/home-assistant-connection-target';
import type { AuthSession } from '@/auth/types';

export interface HomeAssistantClient {
  auth: Auth;
  connection: Connection;
}

async function resolveAuth(session: AuthSession): Promise<Auth> {
  if (session.auth) {
    session.auth.data.hassUrl = session.hassUrl;
    if (session.auth.expired) {
      await session.auth.refreshAccessToken();
    }
    return session.auth;
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
