import authStore from './auth-store.js';
import homeyStore from './homey-store.js';
import openhabStore from './openhab-store.js';
import resourceHostPolicy from './resource-host-policy.js';

const MAX_FEED_BYTES = 1024 * 1024;
const HTTPS_URL_PATTERN = /^https:\/\/(?:[^/?#@]+@)?(\[[^\]]+\]|[^/?#:]+)(?::[0-9]+)?(?:[/?#]|$)/i;

function sendJson(r, statusCode, payload) {
  r.headersOut['Cache-Control'] = 'no-store';
  r.headersOut['Content-Type'] = 'application/json; charset=utf-8';
  r.return(statusCode, JSON.stringify(payload));
}

function decodeQueryValue(value) {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch (error) {
    return value;
  }
}

function getRawQueryString(r) {
  return typeof r.variables.args === 'string' ? r.variables.args : '';
}

function getTargetUrlFromRawQuery(r) {
  const query = getRawQueryString(r);
  if (!query) {
    return '';
  }

  const pairs = query.split('&');
  for (let i = 0; i < pairs.length; i += 1) {
    const pair = pairs[i];
    const separatorIndex = pair.indexOf('=');
    const rawKey = separatorIndex === -1 ? pair : pair.slice(0, separatorIndex);
    if (decodeQueryValue(rawKey) !== 'url') {
      continue;
    }

    const rawValue = separatorIndex === -1 ? '' : pair.slice(separatorIndex + 1);
    return decodeQueryValue(rawValue).trim();
  }

  return '';
}

function getTargetUrl(r) {
  let targetUrl = typeof r.args.url === 'string' ? r.args.url.trim() : '';
  if (!targetUrl) {
    targetUrl = getTargetUrlFromRawQuery(r);
  }

  if (targetUrl.indexOf('https%3A') === 0 || targetUrl.indexOf('https%3a') === 0) {
    targetUrl = decodeQueryValue(targetUrl).trim();
  }

  return targetUrl;
}

function getHttpsHostname(targetUrl) {
  const match = HTTPS_URL_PATTERN.exec(targetUrl);
  if (!match) {
    return null;
  }

  return match[1].replace(/^\[/, '').replace(/\]$/, '');
}

async function handleRequest(r, trustIngressHeaders) {
  if (!authStore.resolveAuthenticatedPrincipal(r, { trustIngressHeaders: trustIngressHeaders }) &&
      !homeyStore.resolveHomeySession(r) && !openhabStore.resolveOpenHABSession(r)) {
    sendJson(r, 401, { error: 'Authentication required' });
    return;
  }
  const targetUrl = getTargetUrl(r);

  if (!targetUrl) {
    sendJson(r, 400, { error: 'Missing url query parameter' });
    return;
  }

  if (targetUrl.indexOf('https://') !== 0) {
    sendJson(r, 400, { error: 'Only HTTPS feeds are allowed' });
    return;
  }

  const hostname = getHttpsHostname(targetUrl);
  if (!hostname) {
    sendJson(r, 400, { error: 'Invalid feed URL' });
    return;
  }

  if (resourceHostPolicy.isBlockedResourceHostname(hostname)) {
    sendJson(r, 400, { error: 'Private feed hosts are not allowed' });
    return;
  }

  try {
    // The local transport resolves and pins public DNS addresses while retaining HTTPS SNI.
    // Request headers (including credentials) are stripped by the internal nginx location.
    const response = await r.subrequest('/__navet_rss_transport__', {
      method: 'POST',
      body: targetUrl,
    });
    const contentType = response.headersOut['Content-Type'];
    if (response.status !== 200) {
      sendJson(r, response.status === 400 || response.status === 413 ? response.status : 502,
        { error: 'Unable to load feed' });
      return;
    }
    if (!resourceHostPolicy.isAllowedResourceXmlContentType(contentType)) {
      sendJson(r, 502, { error: 'Upstream feed returned an unsupported content type' });
      return;
    }
    const body = response.responseText;
    if (Buffer.byteLength(body, 'utf8') > MAX_FEED_BYTES) {
      sendJson(r, 502, { error: 'Upstream feed is too large' });
      return;
    }

    r.headersOut['Cache-Control'] = 'no-store';
    r.headersOut['X-Content-Type-Options'] = 'nosniff';
    r.headersOut['Referrer-Policy'] = 'strict-origin-when-cross-origin';
    r.headersOut['Content-Type'] = contentType;
    r.return(200, body);
  } catch (error) {
    sendJson(r, 502, { error: 'Unable to load feed' });
  }
}

async function handle(r) { return handleRequest(r, false); }
async function handleIngress(r) { return handleRequest(r, true); }

export default { handle: handle, handleIngress: handleIngress };
