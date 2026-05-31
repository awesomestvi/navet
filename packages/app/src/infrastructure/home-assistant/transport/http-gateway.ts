import type { AuthSession } from '@navet/app/auth/types';
import { getRuntimeContext } from '../runtime/runtime-detector';
import type { ResolvedRequest } from './transport-types';

function buildAuthHeaders(session: AuthSession | null, request: ResolvedRequest) {
  if (request.headers) {
    return request.headers;
  }

  if (
    request.authStrategy === 'bearer' &&
    session?.auth?.accessToken &&
    !request.url.startsWith(window.location.origin)
  ) {
    return {
      Authorization: `Bearer ${session.auth.accessToken}`,
    };
  }

  return undefined;
}

export class HomeAssistantHttpGateway {
  constructor(private getSession: () => AuthSession | null) {}

  async fetch(request: ResolvedRequest, init: RequestInit = {}) {
    const session = this.getSession();
    const runtime = getRuntimeContext();
    const credentials =
      request.credentials ??
      (request.authStrategy === 'same_origin' || runtime.supportsSameOriginHaProxy
        ? 'same-origin'
        : undefined);

    return await fetch(request.url, {
      ...init,
      credentials,
      headers: {
        ...(buildAuthHeaders(session, request) ?? {}),
        ...(init.headers ?? {}),
      },
      cache: request.cache ?? init.cache,
    });
  }

  async getJson<T>(request: ResolvedRequest): Promise<T> {
    const response = await this.fetch(request);
    return (await response.json()) as T;
  }

  async getBlob(request: ResolvedRequest): Promise<Blob> {
    const response = await this.fetch(request);
    return await response.blob();
  }
}
