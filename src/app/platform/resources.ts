import type { ResolvedMediaResource } from '@/app/infrastructure/home-assistant/resources/resource-types';
import type { IntegrationProviderId } from '@/app/types/provider';

export type ResolvedPlatformResource = ResolvedMediaResource;

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
