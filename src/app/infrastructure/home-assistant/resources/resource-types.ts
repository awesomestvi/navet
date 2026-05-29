import type {
  PlatformResourceAuthStrategy,
  ResolvedPlatformResource,
} from '@/app/platform/resources';

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

export type ResolvedMediaResource = ResolvedPlatformResource;
export type ResolvedMediaAuthStrategy = PlatformResourceAuthStrategy;

export interface ResolveOptions {
  cacheBustKey?: string | number;
  preferProxy?: boolean;
  allowDirect?: boolean;
}
