import authStore from './auth-store.js';
import providerSessionModule from './provider-session-store.js';

const PROXY_PREFIX = '/__navet_ha_proxy__';
const getHeader = providerSessionModule.getHeader;
const isStrictSameOriginMutation = providerSessionModule.isStrictSameOriginMutation;

function stripProxyPrefix(requestUri) {
  const parts = String(requestUri || '').split('?');
  const path = parts.length > 0 ? parts[0] : '';
  const query = parts.length > 1 && parts[1] ? '?' + parts.slice(1).join('?') : '';
  const hasPrefix =
    path === PROXY_PREFIX || path.indexOf(PROXY_PREFIX + '/') === 0;
  const proxiedPath = hasPrefix ? path.slice(PROXY_PREFIX.length) || '/' : path;
  return proxiedPath + query;
}

function createHomeAssistantProxy(sessionStore) {
  // njs 0.8.10 does not expose WeakMap. Cache on the request wrapper instead,
  // and tolerate non-extensible host objects by falling back to resolution.
  const requestAuthCacheKey = '__navetHomeAssistantProxyAuth';
  const requestAuthCacheOwner = {};

  function request_allowed(r) {
    const method = String((r && r.method) || 'GET').toUpperCase();
    const upgrade = getHeader(r && r.headersIn, 'Upgrade').trim();
    const connection = getHeader(r && r.headersIn, 'Connection').toLowerCase();
    const requestUri = String(
      (r && r.variables && r.variables.request_uri) || ''
    ).split('?')[0];
    const websocket =
      Boolean(upgrade) ||
      connection.split(',').some(function (token) {
        return token.trim() === 'upgrade';
      }) ||
      requestUri === PROXY_PREFIX + '/api/websocket';
    return !websocket && (method === 'GET' || method === 'HEAD')
      ? '1'
      : isStrictSameOriginMutation(r)
        ? '1'
        : '';
  }

  function resolveAuth(r) {
    if (r && typeof r === 'object') {
      try {
        const cached = r[requestAuthCacheKey];
        if (cached && cached.owner === requestAuthCacheOwner) {
          return cached.auth;
        }
      } catch (_error) {
        // Resolve normally when the request host object cannot be inspected.
      }
    }

    const context = sessionStore.resolveStandaloneAuthSession(r);
    const auth = context && context.session ? context.session.auth : null;
    if (r && typeof r === 'object') {
      try {
        r[requestAuthCacheKey] = {
          auth: auth,
          owner: requestAuthCacheOwner,
        };
      } catch (_error) {
        // Correctness does not depend on memoization.
      }
    }
    return auth;
  }

  function upstream_url(r) {
    const auth = resolveAuth(r);
    if (!auth || typeof auth.hassUrl !== 'string') {
      return '';
    }

    return auth.hassUrl.replace(/\/+$/, '') + stripProxyPrefix(r.variables.request_uri);
  }

  function websocket_url(r) {
    const auth = resolveAuth(r);
    if (!auth || typeof auth.hassUrl !== 'string') {
      return '';
    }

    return auth.hassUrl.replace(/\/+$/, '') + '/api/websocket';
  }

  function authorization_header(r) {
    const auth = resolveAuth(r);
    return auth && typeof auth.access_token === 'string' && auth.access_token
      ? 'Bearer ' + auth.access_token
      : '';
  }

  return {
    authorization_header: authorization_header,
    request_allowed: request_allowed,
    upstream_url: upstream_url,
    websocket_url: websocket_url,
  };
}

const homeAssistantProxy = createHomeAssistantProxy(authStore);

export default {
  authorization_header: homeAssistantProxy.authorization_header,
  createHomeAssistantProxy: createHomeAssistantProxy,
  request_allowed: homeAssistantProxy.request_allowed,
  upstream_url: homeAssistantProxy.upstream_url,
  websocket_url: homeAssistantProxy.websocket_url,
};
