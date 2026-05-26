export type HaResourceRef =
  | { kind: 'entity_picture'; entityId: string; rawPath: string }
  | { kind: 'media_artwork'; entityId: string; rawPath: string }
  | { kind: 'camera_snapshot'; entityId: string; rawPath: string }
  | {
      kind: 'camera_stream';
      entityId: string;
      stream: 'hls' | 'web_rtc' | 'mjpeg';
      rawPath?: string;
    }
  | { kind: 'media_source'; mediaContentId: string }
  | { kind: 'absolute_url'; url: string };

export interface ResolvedMediaResource {
  id: string;
  kind: 'image' | 'hls_stream' | 'webrtc_stream' | 'mjpeg_stream' | 'external_link' | 'unavailable';
  url?: string;
  cacheKey: string;
  authStrategy: 'none' | 'same_origin' | 'bearer' | 'panel_bridge';
  expiresAt?: number;
  headers?: Record<string, string>;
  fallback?: ResolvedMediaResource;
  metadata?: {
    mimeType?: string;
    width?: number;
    height?: number;
    source?: string;
  };
}

export interface ResolveOptions {
  cacheBustKey?: string | number;
  preferProxy?: boolean;
  allowDirect?: boolean;
}
