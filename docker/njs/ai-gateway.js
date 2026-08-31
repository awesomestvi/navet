import authStore from './auth-store.js';
import providerSessionStore from './provider-session-store.js';

async function handleWithOptions(r, options) {
  const principal = authStore.resolveAuthenticatedPrincipal(r, {
    trustIngressHeaders: Boolean(options && options.trustIngressHeaders),
  });
  if (!principal) {
    r.return(401, JSON.stringify({ error: 'Authenticated browser session is required' }));
    return;
  }
  if (r.method !== 'GET' && !providerSessionStore.isStrictSameOriginMutation(r)) {
    r.return(403, JSON.stringify({ error: 'Same-origin request required' }));
    return;
  }
  const response = await ngx.fetch('http://127.0.0.1:8098' + r.uri, {
    method: r.method,
    body: r.requestText || undefined,
    headers: { 'content-type': 'application/json', 'x-navet-ai-principal': String(principal.sessionId || '') },
  });
  r.headersOut['Content-Type'] = 'application/json';
  r.headersOut['Cache-Control'] = 'no-store';
  const responseText = await response.text();
  r.return(response.status, responseText);
}

function handle(r) { return handleWithOptions(r, { trustIngressHeaders: false }); }
function handleIngress(r) { return handleWithOptions(r, { trustIngressHeaders: true }); }

export default { handle, handleIngress };
