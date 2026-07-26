import authStore from './auth-store.js';

const PROXY_PREFIX = '/__navet_ha_proxy__';

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
  function resolveAuth(r) {
    const context = sessionStore.resolveStandaloneAuthSession(r);
    return context && context.session ? context.session.auth : null;
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
    upstream_url: upstream_url,
    websocket_url: websocket_url,
  };
}

const homeAssistantProxy = createHomeAssistantProxy(authStore);

export default {
  authorization_header: homeAssistantProxy.authorization_header,
  createHomeAssistantProxy: createHomeAssistantProxy,
  upstream_url: homeAssistantProxy.upstream_url,
  websocket_url: homeAssistantProxy.websocket_url,
};
