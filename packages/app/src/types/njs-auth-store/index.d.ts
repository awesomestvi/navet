declare module '@docker/njs/auth-store.js' {
  interface NjsAuthRequest {
    method: string;
    uri?: string;
    requestText?: string;
    args?: Record<string, string>;
    headersIn?: Record<string, string | undefined>;
    headersOut: Record<string, string>;
    variables?: Record<string, string>;
    return: (status: number, body?: string) => void;
  }

  interface NjsSessionRequest {
    headersIn?: Record<string, string | undefined>;
  }

  interface HomeAssistantAuthData {
    hassUrl: string;
    clientId: string;
    expires: number;
    refresh_token: string;
    access_token: string;
    expires_in: number;
  }

  interface AuthSession {
    sessionId: string;
    updatedAt: number;
    auth?: HomeAssistantAuthData;
    [key: string]: unknown;
  }

  interface AuthSessionContext {
    cookieId: string;
    session: AuthSession;
  }

  interface AuthenticatedPrincipal {
    providerId: string;
    source: 'home_assistant_ingress' | 'standalone_session';
    sessionId: string;
    userId: string | null;
    userName: string | null;
  }

  interface AuthSessionStore {
    getRequestSession(request: NjsAuthRequest): AuthSessionContext | null;
    handle(request: NjsAuthRequest): Promise<void>;
    resolveAuthenticatedPrincipal(
      request: NjsAuthRequest,
      options?: { trustIngressHeaders?: boolean }
    ): AuthenticatedPrincipal | null;
    resolveStandaloneAuthSession(request: NjsSessionRequest): AuthSessionContext | null;
    writeSession(cookieId: string, session: AuthSession): void;
  }

  interface CreateAuthSessionStoreOptions {
    sessionsDirectory: string;
    legacyAuthPath: string;
    fetch?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
  }

  interface AuthStoreModule {
    AUTH_BINDING_HEADER: string;
    AUTH_COOKIE_NAME: string;
    createAuthSessionStore(options: CreateAuthSessionStoreOptions): AuthSessionStore;
  }

  const authStore: AuthStoreModule;
  export default authStore;
}

declare module '@docker/njs/ha-proxy.template.js' {
  interface HomeAssistantProxyRequest {
    headersIn?: Record<string, string | undefined>;
    variables: {
      request_uri: string;
    };
  }

  interface HomeAssistantProxy {
    authorization_header(request: HomeAssistantProxyRequest): string;
    upstream_url(request: HomeAssistantProxyRequest): string;
    websocket_url(request: HomeAssistantProxyRequest): string;
  }

  interface HomeAssistantSessionStore {
    resolveStandaloneAuthSession(request: HomeAssistantProxyRequest): {
      session: {
        auth?: {
          access_token: string;
          hassUrl: string;
        };
      };
    } | null;
  }

  interface HomeAssistantProxyModule extends HomeAssistantProxy {
    createHomeAssistantProxy(sessionStore: HomeAssistantSessionStore): HomeAssistantProxy;
  }

  const homeAssistantProxy: HomeAssistantProxyModule;
  export default homeAssistantProxy;
}
