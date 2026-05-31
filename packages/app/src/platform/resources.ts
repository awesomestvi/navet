import type {
  IntegrationProviderId,
  PlatformResourceAuthStrategy,
  ResolvedPlatformResource,
} from '@navet/core';

export type { PlatformResourceAuthStrategy, ResolvedPlatformResource };

export type PlatformResourceKind =
  | 'primary_image'
  | 'media_artwork'
  | 'camera_snapshot'
  | 'camera_stream';

export interface PlatformResourceDescriptor {
  kind: PlatformResourceKind;
  providerId?: IntegrationProviderId;
  entityId: string;
  path?: string;
}
