import fs from 'fs';

const MAX_PROFILE_BYTES = 1024 * 1024;
const PROFILE_PATH = '/data/navet-dashboard-profile.json';
let fsModule = fs;

function setProfileStoreFsForTests(mockFs) {
  fsModule = mockFs;
}

function resetProfileStoreFsForTests() {
  fsModule = fs;
}

function sendJson(r, statusCode, payload) {
  r.headersOut['Cache-Control'] = 'no-store';
  r.headersOut['Content-Type'] = 'application/json; charset=utf-8';
  r.return(statusCode, JSON.stringify(payload));
}

function sendNoContent(r) {
  r.headersOut['Cache-Control'] = 'no-store';
  r.return(204);
}

function buildProfileMetadata(content, stat) {
  const parsed = JSON.parse(content);
  const exportedAt =
    parsed && typeof parsed === 'object' && typeof parsed.exportedAt === 'string'
      ? parsed.exportedAt
      : 'unknown';

  return {
    etag: `"${stat.mtimeMs}-${content.length}-${exportedAt}"`,
    lastModified: stat.mtime.toUTCString(),
  };
}

function isProfileFresh(r, metadata) {
  const headersIn = r.headersIn || {};
  const ifNoneMatch =
    headersIn['If-None-Match'] !== undefined
      ? headersIn['If-None-Match']
      : headersIn['if-none-match'];
  if (typeof ifNoneMatch === 'string' && ifNoneMatch === metadata.etag) {
    return true;
  }

  const ifModifiedSince =
    headersIn['If-Modified-Since'] !== undefined
      ? headersIn['If-Modified-Since']
      : headersIn['if-modified-since'];
  if (typeof ifModifiedSince === 'string' && ifModifiedSince === metadata.lastModified) {
    return true;
  }

  return false;
}

function readProfile(r) {
  try {
    const stat = fsModule.statSync(PROFILE_PATH);
    if (stat.size > MAX_PROFILE_BYTES) {
      sendJson(r, 413, { error: 'Dashboard profile is too large' });
      return;
    }

    const content = fsModule.readFileSync(PROFILE_PATH, 'utf8');
    const metadata = buildProfileMetadata(content, stat);
    if (isProfileFresh(r, metadata)) {
      r.headersOut['Cache-Control'] = 'no-store';
      r.headersOut.ETag = metadata.etag;
      r.headersOut['Last-Modified'] = metadata.lastModified;
      r.return(304);
      return;
    }

    r.headersOut['Cache-Control'] = 'no-store';
    r.headersOut['Content-Type'] = 'application/json; charset=utf-8';
    r.headersOut.ETag = metadata.etag;
    r.headersOut['Last-Modified'] = metadata.lastModified;
    r.return(200, content);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      sendNoContent(r);
      return;
    }

    sendJson(r, 500, { error: 'Unable to read dashboard profile' });
  }
}

function writeProfile(r) {
  try {
    const body = r.requestText || '';
    if (!body) {
      sendJson(r, 400, { error: 'Missing dashboard profile body' });
      return;
    }

    if (body.length > MAX_PROFILE_BYTES) {
      sendJson(r, 413, { error: 'Dashboard profile is too large' });
      return;
    }

    const parsed = JSON.parse(body);
    if (!parsed || parsed.app !== 'navet' || parsed.version !== 3) {
      sendJson(r, 400, { error: 'Unsupported dashboard profile' });
      return;
    }

    fsModule.writeFileSync(PROFILE_PATH, JSON.stringify(parsed), 'utf8');
    const stat = fsModule.statSync(PROFILE_PATH);
    const metadata = buildProfileMetadata(JSON.stringify(parsed), stat);
    r.headersOut.ETag = metadata.etag;
    r.headersOut['Last-Modified'] = metadata.lastModified;
    sendJson(r, 200, { ok: true, updatedAt: parsed.exportedAt || null });
  } catch (error) {
    sendJson(r, 400, { error: 'Unable to save dashboard profile' });
  }
}

function handle(r) {
  if (r.method === 'GET') {
    readProfile(r);
    return;
  }

  if (r.method === 'PUT') {
    writeProfile(r);
    return;
  }

  r.headersOut.Allow = 'GET, PUT';
  sendJson(r, 405, { error: 'Method not allowed' });
}

export default {
  buildProfileMetadata,
  isProfileFresh,
  readProfile,
  writeProfile,
  handle,
  setProfileStoreFsForTests,
  resetProfileStoreFsForTests,
};
