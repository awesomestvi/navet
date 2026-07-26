import type { ResolvedPlatformResource } from '@navet/app/platform/resources';

export type Go2RtcViewerPresentation = 'native' | 'opaque_iframe';

function parseHttpUrl(value: string, baseUrl: string) {
  try {
    const url = new URL(value, baseUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

/**
 * Classifies a go2rtc viewer URL without probing the remote origin.
 *
 * The native player opens go2rtc's WebSocket endpoint from the dashboard page,
 * which is only compatible with go2rtc's default origin policy when both share
 * an origin. The iframe keeps go2rtc's own page and socket on the same origin.
 */
export function getGo2RtcViewerPresentation(
  viewerUrl: string,
  pageUrl: string
): Go2RtcViewerPresentation {
  const page = parseHttpUrl(pageUrl, pageUrl);
  const viewer = page ? parseHttpUrl(viewerUrl, page.href) : null;
  if (!page || !viewer) {
    return 'opaque_iframe';
  }

  const pathSegments = viewer.pathname.split('/').filter(Boolean);
  const isGo2RtcViewer =
    pathSegments.at(-1) === 'stream.html' &&
    viewer.searchParams.getAll('src').length === 1 &&
    Boolean(viewer.searchParams.get('src')?.trim());

  return isGo2RtcViewer && viewer.origin === page.origin ? 'native' : 'opaque_iframe';
}

export function isOpaqueGo2RtcStreamResource(
  resource: ResolvedPlatformResource | null | undefined,
  pageUrl: string
) {
  return Boolean(
    resource?.kind === 'webrtc_stream' &&
      resource.metadata?.source === 'direct_stream_url' &&
      resource.url &&
      getGo2RtcViewerPresentation(resource.url, pageUrl) === 'opaque_iframe'
  );
}
