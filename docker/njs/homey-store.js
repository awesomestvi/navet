import fs from 'fs';

const MAX_HOMEY_BYTES = 16 * 1024;
const HOMEY_PATH = '/data/navet-homey-session.json';
const ATHOM_API_BASE_URL = 'https://api.athom.com';
const DEFAULT_HOMEY_CALLBACK_PATH = '/__navet_homey__/callback';

function normalizeIngressPath(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') {
    return '';
  }

  const normalized = trimmed.replace(/\/+$/, '');
  return normalized.startsWith('/') ? normalized : '';
}

function joinPath(basePath, suffix) {
  const normalizedBase = normalizeIngressPath(basePath);
  const normalizedSuffix = String(suffix || '').startsWith('/')
    ? String(suffix || '')
    : '/' + String(suffix || '');

  return normalizedBase ? normalizedBase + normalizedSuffix : normalizedSuffix;
}

function sendJson(r, statusCode, payload) {
  r.headersOut['Cache-Control'] = 'no-store';
  r.headersOut['Content-Type'] = 'application/json; charset=utf-8';
  r.return(statusCode, JSON.stringify(payload));
}

function sendRedirect(r, location) {
  r.headersOut['Cache-Control'] = 'no-store';
  r.return(302, location);
}

function sendNoContent(r) {
  r.headersOut['Cache-Control'] = 'no-store';
  r.return(204);
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

function isValidHomey(homey) {
  return (
    homey &&
    typeof homey.id === 'string' &&
    homey.id.length > 0 &&
    typeof homey.name === 'string' &&
    homey.name.length > 0
  );
}

function isValidHomeyUser(user) {
  return (
    user &&
    typeof user.name === 'string' &&
    user.name.length > 0 &&
    (user.id == null || typeof user.id === 'string') &&
    (user.avatarUrl == null || typeof user.avatarUrl === 'string') &&
    (user.email == null || typeof user.email === 'string') &&
    (user.is_owner == null || typeof user.is_owner === 'boolean') &&
    (user.is_admin == null || typeof user.is_admin === 'boolean')
  );
}

function isValidHomeySession(value) {
  return (
    value &&
    typeof value.accessToken === 'string' &&
    value.accessToken.length > 0 &&
    typeof value.refreshToken === 'string' &&
    value.refreshToken.length > 0 &&
    typeof value.expiresAt === 'number' &&
    (value.user == null || isValidHomeyUser(value.user)) &&
    Array.isArray(value.homeys) &&
    value.homeys.every(isValidHomey) &&
    (value.selectedHomeyId == null || typeof value.selectedHomeyId === 'string') &&
    (value.homeyBaseUrl == null || /^https?:\/\//.test(value.homeyBaseUrl)) &&
    (value.homeySessionToken == null || typeof value.homeySessionToken === 'string') &&
    (value.userId == null || typeof value.userId === 'string')
  );
}

function readStoredSession() {
  try {
    const stat = fs.statSync(HOMEY_PATH);
    if (stat.size > MAX_HOMEY_BYTES) {
      return null;
    }

    const parsed = parseJson(fs.readFileSync(HOMEY_PATH, 'utf8'));
    return isValidHomeySession(parsed) ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function writeStoredSession(session) {
  fs.writeFileSync(HOMEY_PATH, JSON.stringify(session), 'utf8');
}

function clearStoredSession() {
  try {
    fs.unlinkSync(HOMEY_PATH);
  } catch (error) {
    if (!error || error.code !== 'ENOENT') {
      throw error;
    }
  }
}

function sanitizeSession(session) {
  return {
    userId: session.userId || null,
    user: session.user || null,
    homeys: session.homeys,
    selectedHomeyId: session.selectedHomeyId || null,
    homeyBaseUrl: session.homeyBaseUrl || null,
    hasActiveHomeySession: Boolean(session.homeySessionToken),
  };
}

function getHomeyUserName(user) {
  const first = typeof user.firstname === 'string' ? user.firstname.trim() : '';
  const last = typeof user.lastname === 'string' ? user.lastname.trim() : '';
  const fullName = (first + ' ' + last).trim();
  return (
    fullName ||
    (typeof user.name === 'string' && user.name.trim()) ||
    user.email ||
    'Homey User'
  );
}

function getHomeyUserAvatarUrl(user) {
  const candidates = [user.avatarUrl, user.imageUrl, user.avatar, user.image, user.gravatar];
  let index;

  for (index = 0; index < candidates.length; index += 1) {
    if (typeof candidates[index] === 'string' && candidates[index].trim()) {
      return candidates[index].trim();
    }
  }

  return null;
}

function getOAuthConfig(r) {
  const ingressPath = normalizeIngressPath(r.headersIn['X-Ingress-Path']);
  const clientId = process.env.NAVET_HOMEY_CLIENT_ID || '';
  const clientSecret = process.env.NAVET_HOMEY_CLIENT_SECRET || '';
  const configuredRedirectUri = process.env.NAVET_HOMEY_REDIRECT_URI || '';
  const redirectUri =
    configuredRedirectUri ||
    getRequestOrigin(r) + joinPath(ingressPath, DEFAULT_HOMEY_CALLBACK_PATH);
  const callbackPath = getCallbackPath(redirectUri, ingressPath);

  return {
    clientId,
    clientSecret,
    redirectUri,
    callbackPath,
    ingressPath,
  };
}

function getCallbackPath(redirectUri, ingressPath) {
  try {
    const pathname = new URL(redirectUri).pathname.trim();
    if (!pathname) {
      return DEFAULT_HOMEY_CALLBACK_PATH;
    }

    if (ingressPath && pathname.indexOf(ingressPath) === 0) {
      const localPath = pathname.slice(ingressPath.length);
      return localPath || DEFAULT_HOMEY_CALLBACK_PATH;
    }

    return pathname;
  } catch (_error) {
    return DEFAULT_HOMEY_CALLBACK_PATH;
  }
}

function getRequestOrigin(r) {
  const host = r.headersIn.Host || 'localhost';
  const forwardedProto = typeof r.headersIn['X-Forwarded-Proto'] === 'string'
    ? r.headersIn['X-Forwarded-Proto'].split(',')[0].trim()
    : '';
  const protocol = forwardedProto || 'http';
  return protocol + '://' + host;
}

function getNavetReturnPath(oauth) {
  return joinPath(oauth.ingressPath, '/');
}

function encodeClientCredentials(clientId, clientSecret) {
  return Buffer.from(clientId + ':' + clientSecret).toString('base64');
}

function getHomeyBaseUrlCandidates(homey) {
  const candidates = [homey.localUrlSecure, homey.localUrl, homey.remoteUrl].filter(Boolean);
  return Array.from(new Set(candidates));
}

function cloneWithOverrides(source, overrides) {
  const next = {};
  let key;

  for (key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      next[key] = source[key];
    }
  }

  for (key in overrides) {
    if (Object.prototype.hasOwnProperty.call(overrides, key)) {
      next[key] = overrides[key];
    }
  }

  return next;
}

async function refreshAccessToken(r, session) {
  if (session.expiresAt > Date.now() + 30000) {
    return session;
  }

  const oauth = getOAuthConfig(r);
  if (!oauth.clientId || !oauth.clientSecret) {
    throw new Error('Homey OAuth credentials are not configured');
  }

  const response = await ngx.fetch(ATHOM_API_BASE_URL + '/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + encodeClientCredentials(oauth.clientId, oauth.clientSecret),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body:
      'grant_type=refresh_token&refresh_token=' + encodeURIComponent(session.refreshToken),
  });

  if (!response.ok) {
    throw new Error('Unable to refresh Homey OAuth token');
  }

  const token = await response.json();
  const nextSession = cloneWithOverrides(session, {
    accessToken: token.access_token,
    refreshToken: token.refresh_token || session.refreshToken,
    expiresAt: Date.now() + Number(token.expires_in || 0) * 1000,
  });
  writeStoredSession(nextSession);
  return nextSession;
}

async function loadAuthenticatedUser(accessToken) {
  const response = await ngx.fetch(ATHOM_API_BASE_URL + '/user/me', {
    headers: {
      Authorization: 'Bearer ' + accessToken,
    },
  });

  if (!response.ok) {
    throw new Error('Unable to load Homey account');
  }

  return await response.json();
}

async function createHomeySession(accessToken, homey) {
  const homeyBaseUrls = getHomeyBaseUrlCandidates(homey);
  if (homeyBaseUrls.length === 0) {
    throw new Error('The selected Homey has no usable URL');
  }

  const delegationResponse = await ngx.fetch(
    ATHOM_API_BASE_URL + '/delegation/token?audience=homey',
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
      },
    }
  );

  if (!delegationResponse.ok) {
    throw new Error('Unable to create Homey delegation token');
  }

  const delegationResponseText = await delegationResponse.text();
  const delegationToken = parseJson(delegationResponseText);
  let index;
  let lastError = null;

  for (index = 0; index < homeyBaseUrls.length; index += 1) {
    const homeyBaseUrl = homeyBaseUrls[index];

    try {
      const sessionResponse = await ngx.fetch(homeyBaseUrl + '/api/manager/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: delegationToken }),
      });

      if (!sessionResponse.ok) {
        lastError = new Error('Unable to create Homey session');
        continue;
      }

      const sessionResponseText = await sessionResponse.text();
      const homeySessionToken = parseJson(sessionResponseText);
      return {
        homeyBaseUrl: homeyBaseUrl,
        homeySessionToken: homeySessionToken,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to create Homey session');
}

async function handleAuthorize(r) {
  const oauth = getOAuthConfig(r);
  if (!oauth.clientId) {
    sendJson(r, 500, { error: 'Homey OAuth client ID is not configured' });
    return;
  }

  const state = Buffer.from(
    JSON.stringify({ returnTo: getNavetReturnPath(oauth) })
  ).toString('base64');
  const location =
    ATHOM_API_BASE_URL +
    '/oauth2/authorise?response_type=code&client_id=' +
    encodeURIComponent(oauth.clientId) +
    '&redirect_uri=' +
    encodeURIComponent(oauth.redirectUri) +
    '&state=' +
    encodeURIComponent(state);

  sendRedirect(r, location);
}

async function handleCallback(r) {
  const oauth = getOAuthConfig(r);
  const code = typeof r.args.code === 'string' ? r.args.code.trim() : '';
  if (!code || !oauth.clientId || !oauth.clientSecret) {
    sendJson(r, 400, { error: 'Homey OAuth callback is incomplete' });
    return;
  }

  try {
    const tokenResponse = await ngx.fetch(ATHOM_API_BASE_URL + '/oauth2/token', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + encodeClientCredentials(oauth.clientId, oauth.clientSecret),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body:
        'grant_type=authorization_code&code=' +
        encodeURIComponent(code) +
        '&redirect_uri=' +
        encodeURIComponent(oauth.redirectUri),
    });

    if (!tokenResponse.ok) {
      sendJson(r, 502, { error: 'Homey OAuth token exchange failed' });
      return;
    }

    const token = await tokenResponse.json();
    const user = await loadAuthenticatedUser(token.access_token);
    const homeys = Array.isArray(user.homeys)
      ? user.homeys
          .map(function (homey) {
            if (!homey || typeof homey._id !== 'string' || typeof homey.name !== 'string') {
              return null;
            }

            return {
              id: homey._id,
              name: homey.name,
              platform: homey.platform || null,
              localUrl: homey.localUrl || null,
              localUrlSecure: homey.localUrlSecure || null,
              remoteUrl: homey.remoteUrl || null,
            };
          })
          .filter(Boolean)
      : [];

    let session = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + Number(token.expires_in || 0) * 1000,
      userId: user._id || null,
      user: {
        id: user._id || null,
        name: getHomeyUserName(user),
        avatarUrl: getHomeyUserAvatarUrl(user),
        email: user.email || null,
      },
      homeys: homeys,
      selectedHomeyId: null,
      homeyBaseUrl: null,
      homeySessionToken: null,
    };

    if (homeys.length === 1) {
      const selection = await createHomeySession(session.accessToken, homeys[0]);
      session = cloneWithOverrides(session, {
        selectedHomeyId: homeys[0].id,
        homeyBaseUrl: selection.homeyBaseUrl,
        homeySessionToken: selection.homeySessionToken,
      });
    }

    writeStoredSession(session);
    sendRedirect(r, getRequestOrigin(r) + getNavetReturnPath(oauth) + '?homey_oauth_callback=1');
  } catch (_error) {
    sendJson(r, 502, { error: 'Unable to complete Homey OAuth callback' });
  }
}

async function handleSessionGet(r) {
  const session = readStoredSession();
  if (!session) {
    sendNoContent(r);
    return;
  }

  try {
    const refreshed = await refreshAccessToken(r, session);
    sendJson(r, 200, sanitizeSession(refreshed));
  } catch (_error) {
    sendJson(r, 200, sanitizeSession(session));
  }
}

function handleSessionPut(r) {
  const body = parseJson(r.requestText || '');
  if (!isValidHomeySession(body)) {
    sendJson(r, 400, { error: 'Unsupported Homey session' });
    return;
  }

  writeStoredSession(body);
  sendJson(r, 200, sanitizeSession(body));
}

function handleSessionDelete(r) {
  try {
    clearStoredSession();
    sendJson(r, 200, { ok: true });
  } catch (_error) {
    sendJson(r, 500, { error: 'Unable to clear Homey session' });
  }
}

async function handleSelection(r) {
  if (r.method !== 'PUT') {
    r.headersOut.Allow = 'PUT';
    sendJson(r, 405, { error: 'Method not allowed' });
    return;
  }

  const session = readStoredSession();
  if (!session) {
    sendJson(r, 404, { error: 'No Homey OAuth session available' });
    return;
  }

  const refreshed = await refreshAccessToken(r, session);
  const body = parseJson(r.requestText || '') || {};
  const homeyId = typeof body.homeyId === 'string' ? body.homeyId.trim() : '';
  if (!homeyId) {
    sendJson(r, 400, { error: 'homeyId is required' });
    return;
  }

  const homey = refreshed.homeys.find(function (entry) {
    return entry.id === homeyId;
  });
  if (!homey) {
    sendJson(r, 404, { error: 'Homey not found in OAuth session' });
    return;
  }

  try {
    const selection = await createHomeySession(refreshed.accessToken, homey);
    const nextSession = cloneWithOverrides(refreshed, {
      selectedHomeyId: homey.id,
      homeyBaseUrl: selection.homeyBaseUrl,
      homeySessionToken: selection.homeySessionToken,
    });
    writeStoredSession(nextSession);
    sendJson(r, 200, sanitizeSession(nextSession));
  } catch (_error) {
    sendJson(r, 502, { error: 'Unable to select Homey' });
  }
}

async function handle(r) {
  const oauth = getOAuthConfig(r);

  if (r.uri === '/__navet_homey__/authorize') {
    await handleAuthorize(r);
    return;
  }

  if (r.uri === oauth.callbackPath) {
    await handleCallback(r);
    return;
  }

  if (r.uri === '/__navet_homey__/session/select') {
    await handleSelection(r);
    return;
  }

  if (r.uri !== '/__navet_homey__/session') {
    sendJson(r, 404, { error: 'Unknown Homey auth endpoint' });
    return;
  }

  if (r.method === 'GET') {
    await handleSessionGet(r);
    return;
  }

  if (r.method === 'PUT') {
    handleSessionPut(r);
    return;
  }

  if (r.method === 'DELETE') {
    handleSessionDelete(r);
    return;
  }

  r.headersOut.Allow = 'GET, PUT, DELETE';
  sendJson(r, 405, { error: 'Method not allowed' });
}

export default { handle: handle };
