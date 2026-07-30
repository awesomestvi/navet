import openHABStoreModule from './openhab-store.js';
import providerSessionModule from './provider-session-store.js';

const PROXY_PREFIX = '/__navet_openhab_proxy__';
const getHeader = providerSessionModule.getHeader;
const isStrictSameOriginMutation = providerSessionModule.isStrictSameOriginMutation;

function resolveAllowedSuffix(r) {
  const requestUri = String((r && r.variables && r.variables.request_uri) || '');
  const separator = requestUri.indexOf('?');
  const rawPath = separator === -1 ? requestUri : requestUri.slice(0, separator);
  const query = separator === -1 ? '' : requestUri.slice(separator + 1);
  if (/%25/i.test(rawPath)) {
    // Reject nested percent-encoding before decoding once. Item names do not
    // require literal percent bytes, while traversal and query delimiters do.
    return '';
  }
  let path;
  try {
    path = decodeURIComponent(rawPath);
  } catch (_error) {
    return '';
  }
  if (
    rawPath.indexOf(PROXY_PREFIX) !== 0 ||
    path.includes('..') ||
    path.includes('\\')
  ) {
    return '';
  }

  const suffix = path.slice(PROXY_PREFIX.length) || '/';
  if (r.method === 'GET' && suffix === '/rest/items' && query === 'recursive=false') {
    return '/rest/items?recursive=false';
  }

  if (
    r.method === 'POST' &&
    /^\/rest\/items\/[A-Za-z0-9_]+$/.test(suffix) &&
    !query &&
    isStrictSameOriginMutation(r)
  ) {
    return suffix;
  }

  if (
    r.method === 'GET' &&
    suffix === '/ws' &&
    !query &&
    isStrictSameOriginMutation(r) &&
    getHeader(r.headersIn, 'Upgrade').toLowerCase() === 'websocket' &&
    getHeader(r.headersIn, 'Connection').toLowerCase().includes('upgrade')
  ) {
    return '/ws';
  }

  return '';
}

function createOpenHABProxy(sessionStore) {
  function resolveTarget(r) {
    const context = sessionStore.resolveOpenHABSession(r);
    const suffix = resolveAllowedSuffix(r);
    const baseUrl =
      context && openHABStoreModule.normalizeOpenHABBaseUrl(context.session.hassUrl);
    return context && suffix && baseUrl
      ? { context: context, target: baseUrl + suffix }
      : null;
  }

  function upstreamUrl(r) {
    const resolved = resolveTarget(r);
    return resolved ? resolved.target : '';
  }

  function authorizationHeader(r) {
    const resolved = resolveTarget(r);
    if (!resolved) {
      return '';
    }

    return (
      'Basic ' +
      Buffer.from(
        resolved.context.session.username + ':' + resolved.context.session.password
      ).toString('base64')
    );
  }

  return {
    authorization_header: authorizationHeader,
    upstream_url: upstreamUrl,
  };
}

const openHABProxy = createOpenHABProxy(openHABStoreModule);

export default {
  authorization_header: openHABProxy.authorization_header,
  createOpenHABProxy,
  upstream_url: openHABProxy.upstream_url,
};
