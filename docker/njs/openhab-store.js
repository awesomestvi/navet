import fs from 'fs';

const MAX_OPENHAB_BYTES = 8 * 1024;
const OPENHAB_PATH = '/data/navet-openhab-session.json';

function sendJson(r, statusCode, payload) {
  r.headersOut['Cache-Control'] = 'no-store';
  r.headersOut['Content-Type'] = 'application/json; charset=utf-8';
  r.return(statusCode, JSON.stringify(payload));
}

function sendNoContent(r) {
  r.headersOut['Cache-Control'] = 'no-store';
  r.return(204);
}

function isValidOpenHABSession(value) {
  return (
    value &&
    typeof value.hassUrl === 'string' &&
    /^https?:\/\//.test(value.hassUrl) &&
    typeof value.username === 'string' &&
    value.username.trim().length > 0 &&
    typeof value.password === 'string' &&
    value.password.length > 0
  );
}

function readSession(r) {
  try {
    const stat = fs.statSync(OPENHAB_PATH);
    if (stat.size > MAX_OPENHAB_BYTES) {
      sendJson(r, 413, { error: 'openHAB session is too large' });
      return;
    }

    const content = fs.readFileSync(OPENHAB_PATH, 'utf8');
    const parsed = JSON.parse(content);
    if (!isValidOpenHABSession(parsed)) {
      sendNoContent(r);
      return;
    }

    sendJson(r, 200, parsed);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      sendNoContent(r);
      return;
    }

    sendJson(r, 500, { error: 'Unable to read openHAB session' });
  }
}

function writeSession(r) {
  try {
    const body = r.requestText || '';
    if (!body || body.length > MAX_OPENHAB_BYTES) {
      sendJson(r, 400, { error: 'Invalid openHAB session body' });
      return;
    }

    const parsed = JSON.parse(body);
    if (!isValidOpenHABSession(parsed)) {
      sendJson(r, 400, { error: 'Unsupported openHAB session' });
      return;
    }

    fs.writeFileSync(OPENHAB_PATH, JSON.stringify(parsed), 'utf8');
    sendJson(r, 200, { ok: true });
  } catch (_error) {
    sendJson(r, 400, { error: 'Unable to save openHAB session' });
  }
}

function deleteSession(r) {
  try {
    fs.unlinkSync(OPENHAB_PATH);
  } catch (error) {
    if (!error || error.code !== 'ENOENT') {
      sendJson(r, 500, { error: 'Unable to clear openHAB session' });
      return;
    }
  }

  sendJson(r, 200, { ok: true });
}

function handle(r) {
  if (r.method === 'GET') {
    readSession(r);
    return;
  }

  if (r.method === 'PUT') {
    writeSession(r);
    return;
  }

  if (r.method === 'DELETE') {
    deleteSession(r);
    return;
  }

  r.headersOut.Allow = 'GET, PUT, DELETE';
  sendJson(r, 405, { error: 'Method not allowed' });
}

export default { handle };
