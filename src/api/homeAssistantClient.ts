import type { Connection } from 'home-assistant-js-websocket';
import { createConnection, createLongLivedTokenAuth, getAuth } from 'home-assistant-js-websocket';
import type { AuthSession } from '@/auth/types';

export async function createHomeAssistantClient(session: AuthSession): Promise<Connection> {
  const auth = session.refreshToken
    ? await getAuth({ hassUrl: session.hassUrl })
    : createLongLivedTokenAuth(session.hassUrl, session.accessToken);

  if (auth.expired) {
    await auth.refreshAccessToken();
  }

  return createConnection({ auth, setupRetry: 3 });
}
