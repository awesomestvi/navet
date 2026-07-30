import homeyStoreModule from './homey-store.js';
import providerSessionModule from './provider-session-store.js';

const PROXY_PREFIX = '/__navet_homey_proxy__';
const getHeader = providerSessionModule.getHeader;
const isStrictSameOriginMutation = providerSessionModule.isStrictSameOriginMutation;

function normalizeBaseUrl(value) {
  if (typeof value !== 'string' || !/^https?:\/\//.test(value)) {
    return '';
  }

  return value.replace(/\/+$/, '');
}

function stripProxyPrefix(requestUri) {
  const parts = String(requestUri || '').split('?');
  const path = parts.length > 0 ? parts[0] : '';
  const query = parts.length > 1 && parts[1] ? '?' + parts[1] : '';
  const hasPrefix = path.indexOf(PROXY_PREFIX) === 0;
  const proxiedPath = hasPrefix ? path.slice(PROXY_PREFIX.length) || '/' : path;
  return proxiedPath + query;
}

function createHomeyProxy(sessionStore) {
  function requestAllowed(r) {
    const method = String((r && r.method) || 'GET').toUpperCase();
    const upgrade = getHeader(r && r.headersIn, 'Upgrade').trim();
    const connection = getHeader(r && r.headersIn, 'Connection').toLowerCase();
    const upgraded =
      Boolean(upgrade) ||
      connection.split(',').some(function (token) {
        return token.trim() === 'upgrade';
      });
    return !upgraded && (method === 'GET' || method === 'HEAD')
      ? '1'
      : isStrictSameOriginMutation(r)
        ? '1'
        : '';
  }

  function upstreamUrl(r) {
    const context = sessionStore.resolveHomeySession(r);
    const baseUrl = context ? normalizeBaseUrl(context.session.homeyBaseUrl) : '';
    if (!baseUrl || !context.session.homeySessionToken) {
      return '';
    }

    return baseUrl + stripProxyPrefix(r.variables.request_uri);
  }

  function authorizationHeader(r) {
    const context = sessionStore.resolveHomeySession(r);
    return context && context.session.homeySessionToken
      ? 'Bearer ' + context.session.homeySessionToken
      : '';
  }

  return {
    authorization_header: authorizationHeader,
    request_allowed: requestAllowed,
    upstream_url: upstreamUrl,
  };
}

const homeyProxy = createHomeyProxy(homeyStoreModule);

export default {
  authorization_header: homeyProxy.authorization_header,
  createHomeyProxy,
  request_allowed: homeyProxy.request_allowed,
  upstream_url: homeyProxy.upstream_url,
};
