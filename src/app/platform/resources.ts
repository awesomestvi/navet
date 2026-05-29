import type { IntegrationProviderId } from '@/app/types/provider';

export type PlatformResourceAuthStrategy = 'none' | 'same_origin' | 'bearer' | 'panel_bridge';

export interface ResolvedPlatformResource {
  id: string;
  kind: 'image' | 'hls_stream' | 'webrtc_stream' | 'mjpeg_stream' | 'external_link' | 'unavailable';
  url?: string;
  cacheKey: string;
  authStrategy: PlatformResourceAuthStrategy;
  expiresAt?: number;
  headers?: Record<string, string>;
  fallback?: ResolvedPlatformResource;
  metadata?: {
    mimeType?: string;
    width?: number;
    height?: number;
    source?: string;
  };
}

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
