import { URL } from 'node:url';
import {
  isAllowedResourceXmlContentType,
  isBlockedResourceHostname,
} from '../packages/core/src/resource-host-policy.ts';
import {
  PublicResourcePolicyError,
  requestPublicResource,
} from './vite-public-resource-request.ts';
import { readBoundedResponseText } from './vite-response-body.ts';

export const RSS_MAX_BYTES = 1024 * 1024;
export const RSS_TIMEOUT_MS = 10_000;
export const RSS_MAX_URL_BYTES = 8192;

export interface RssFeedResponse {
  status: number;
  contentType: string;
  body: string;
}

export function rssError(status: number, error: string): RssFeedResponse {
  return {
    status,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify({ error }),
  };
}

/** Shared production/development feed policy, including pinned public DNS and bounded streaming. */
export async function fetchPublicRssFeed(
  target: string,
  signal: AbortSignal
): Promise<RssFeedResponse> {
  if (Buffer.byteLength(target, 'utf8') > RSS_MAX_URL_BYTES)
    return rssError(413, 'Feed URL is too large');
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return rssError(400, 'Invalid feed URL');
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    return rssError(400, 'Only HTTPS feeds without credentials are allowed');
  }
  if (isBlockedResourceHostname(url.hostname)) {
    return rssError(400, 'Private feed hosts are not allowed');
  }

  try {
    const response = await requestPublicResource(url, {
      signal,
      headers: {
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9',
        'User-Agent': 'Navet RSS Reader/1.0',
      },
    });
    if (!response.ok) {
      await response.body?.cancel();
      return rssError(502, `Upstream feed request failed with status ${response.status}`);
    }
    const contentType = response.headers.get('content-type');
    if (!isAllowedResourceXmlContentType(contentType)) {
      await response.body?.cancel();
      return rssError(502, 'Upstream feed returned an unsupported content type');
    }
    if (Number(response.headers.get('content-length') ?? '0') > RSS_MAX_BYTES) {
      await response.body?.cancel();
      return rssError(502, 'Upstream feed is too large');
    }
    const body = await readBoundedResponseText(response, RSS_MAX_BYTES);
    return { status: 200, contentType: contentType ?? 'application/xml; charset=utf-8', body };
  } catch (error) {
    if (error instanceof PublicResourcePolicyError)
      return rssError(400, 'Private feed hosts are not allowed');
    return rssError(502, 'Unable to load feed');
  }
}
