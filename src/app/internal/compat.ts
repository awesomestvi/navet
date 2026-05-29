import type { NavetProviderState, NavetResourceKind } from '@navet/core/types';
import type { NavetProviderSession } from '@/app/internal/compat-models';
import type { ProviderMediaFeatureService } from '@/app/platform/provider-feature-services';
import type { ResolvedPlatformResource } from '@/app/platform/resources';
import type { IntegrationProviderId } from '@/app/types/provider';
import type { AuthSession, AuthSessionMap } from '@/auth/types';

export type {
  NavetDevice,
  NavetProviderHealth,
  NavetProviderRuntimeState,
  NavetProviderSession,
  NavetProviderSnapshot,
  NavetRoom,
  NavetRoomDescriptor,
  NavetRoomDescriptorSource,
} from '@/app/internal/compat-models';

export interface NavetResourceResolveRequest {
  deviceId: string;
  providerId: IntegrationProviderId;
  kind: NavetResourceKind;
  attrs?: Record<string, unknown>;
  fallbackPicture?: string;
}

export interface NavetProviderContract {
  providerId: IntegrationProviderId;
  bootstrapSession?: (sessions: AuthSessionMap) => NavetProviderSession | null;
  initializeSession?: (session: AuthSession) => Promise<void>;
  attachRuntimeBridge?: (bridge: unknown) => void;
  teardownSession?: () => void;
  getState: () => NavetProviderState;
  subscribeState?: (listener: () => void) => () => void;
  resolveResource?: (
    request: NavetResourceResolveRequest
  ) => Promise<ResolvedPlatformResource> | ResolvedPlatformResource;
  normalizeResourceUrl?: (resourceUrl: string) => string | null;
  media?: ProviderMediaFeatureService;
}
