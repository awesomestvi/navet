import fs from 'fs';

const MAX_AUTH_BYTES = 16 * 1024;
const AUTH_PATH = '/data/navet-auth-session.json';

function sendJson(r, statusCode, payload) {
  r.headersOut['Cache-Control'] = 'no-store';
  r.headersOut['Content-Type'] = 'application/json; charset=utf-8';
  r.return(statusCode, JSON.stringify(payload));
}

function sendNoContent(r) {
  r.headersOut['Cache-Control'] = 'no-store';
  r.return(204);
}

function isValidAuthData(value) {
  return (
    value &&
    typeof value.hassUrl === 'string' &&
    /^https?:\/\//.test(value.hassUrl) &&
    (typeof value.clientId === 'string' || value.clientId === null) &&
    typeof value.expires === 'number' &&
    typeof value.refresh_token === 'string' &&
    value.refresh_token.length > 0 &&
    typeof value.access_token === 'string' &&
    value.access_token.length > 0 &&
    typeof value.expires_in === 'number'
  );
}

function readAuth(r) {
  try {
    const stat = fs.statSync(AUTH_PATH);
    if (stat.size > MAX_AUTH_BYTES) {
      sendJson(r, 413, { error: 'Auth session is too large' });
      return;
    }

    const content = fs.readFileSync(AUTH_PATH, 'utf8');
    const parsed = JSON.parse(content);
    if (!isValidAuthData(parsed)) {
      sendNoContent(r);
      return;
    }

    sendJson(r, 200, parsed);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      sendNoContent(r);
      return;
    }

    sendJson(r, 500, { error: 'Unable to read auth session' });
  }
}

function writeAuth(r) {
  try {
    const body = r.requestText || '';
    if (!body || body.length > MAX_AUTH_BYTES) {
      sendJson(r, 400, { error: 'Invalid auth session body' });
      return;
    }

    const parsed = JSON.parse(body);
    if (!isValidAuthData(parsed)) {
      sendJson(r, 400, { error: 'Unsupported auth session' });
      return;
    }

    fs.writeFileSync(AUTH_PATH, JSON.stringify(parsed), 'utf8');
    sendJson(r, 200, { ok: true });
  } catch (_error) {
    sendJson(r, 400, { error: 'Unable to save auth session' });
  }
}

function deleteAuth(r) {
  try {
    fs.unlinkSync(AUTH_PATH);
  } catch (error) {
    if (!error || error.code !== 'ENOENT') {
      sendJson(r, 500, { error: 'Unable to clear auth session' });
      return;
    }
  }

  sendJson(r, 200, { ok: true });
}

function handle(r) {
  if (r.method === 'GET') {
    readAuth(r);
    return;
  }

  if (r.method === 'PUT') {
    writeAuth(r);
    return;
  }

  if (r.method === 'DELETE') {
    deleteAuth(r);
    return;
  }

  r.headersOut.Allow = 'GET, PUT, DELETE';
  sendJson(r, 405, { error: 'Method not allowed' });
}

export default { handle: handle };
