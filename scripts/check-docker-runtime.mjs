import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with status ${result.status}`);
  }
}

function ensureDockerAvailable() {
  const result = spawnSync('docker', ['info'], {
    stdio: 'pipe',
    encoding: 'utf8',
  });

  if (!result.error && result.status === 0) {
    return;
  }

  const message =
    result.error?.message ||
    result.stderr ||
    result.stdout ||
    'Docker is unavailable. Start Docker Desktop or another Docker daemon and try again.';
  throw new Error(`check:docker requires a running Docker daemon.\n${message.trim()}`);
}

function ensureSerializedProfileRuntime() {
  const workerConfigs = [
    'docker/nginx.main.conf',
    'platform/home-assistant/addons/navet/rootfs/etc/nginx/nginx.conf',
  ];
  for (const file of workerConfigs) {
    const source = readFileSync(file, 'utf8');
    if (!/^\s*worker_processes\s+1\s*;/m.test(source)) {
      throw new Error(`${file} must serialize local profile-store writes with one Nginx worker`);
    }
  }

  const addonConfigs = [
    'platform/home-assistant/addons/navet/config.yaml',
    'platform/home-assistant/addons/navet-dev/config.yaml',
  ];
  for (const file of addonConfigs) {
    const source = readFileSync(file, 'utf8');
    if (/^ports(?:_description)?:/m.test(source)) {
      throw new Error(`${file} must remain Ingress-only without a published host port`);
    }
  }
}

function ensurePersistentDataConfiguration() {
  const dockerfile = readFileSync('Dockerfile', 'utf8');
  if (!/^VOLUME\s+\["\/data"\]\s*$/m.test(dockerfile)) {
    throw new Error('Dockerfile must declare /data as the standalone persistent-data volume');
  }

  const compose = readFileSync('docker-compose.yml', 'utf8');
  if (
    !/^\s+-\s+navet-data:\/data\s*$/m.test(compose) ||
    !/^volumes:\s*\n\s+navet-data:\s*$/m.test(compose)
  ) {
    throw new Error('docker-compose.yml must mount its named navet-data volume at /data');
  }

  const standaloneEntrypoint = readFileSync('docker/30-navet-config.sh', 'utf8');
  const addonEntrypoint = readFileSync('platform/home-assistant/addons/navet/run.sh', 'utf8');
  for (const [file, source] of [
    ['docker/30-navet-config.sh', standaloneEntrypoint],
    ['platform/home-assistant/addons/navet/run.sh', addonEntrypoint],
  ]) {
    if (!source.includes('mkdir -p /data') || !source.includes('chown nginx:nginx /data')) {
      throw new Error(`${file} must prepare the persistent /data mount for the Nginx worker`);
    }
  }
}

function assertBuiltStandaloneMetadata(containerName, expectedBuildVersion) {
  const result = spawnSync(
    'docker',
    [
      'exec',
      containerName,
      'grep',
      '-R',
      '-F',
      '-l',
      expectedBuildVersion,
      '/usr/share/nginx/html/assets',
    ],
    { stdio: 'pipe', encoding: 'utf8' }
  );
  const matchingJavaScriptAssets = result.stdout
    .split('\n')
    .map((value) => value.trim())
    .filter((value) => value.endsWith('.js'));
  if (result.error || result.status !== 0 || matchingJavaScriptAssets.length === 0) {
    const diagnostic = [result.stderr?.trim(), result.stdout?.trim()].filter(Boolean).join('\n');
    throw new Error(
      `Built standalone UI is missing exact build version ${expectedBuildVersion}${
        diagnostic ? `\n${diagnostic}` : ''
      }`
    );
  }
}

function extractCookie(response, cookieName) {
  return response.headers
    .get('set-cookie')
    ?.match(new RegExp(`(?:^|,\\s*)(${cookieName}=[a-f0-9]{64})(?:;|$)`, 'i'))?.[1];
}

function assertSecurityHeaders(response, surface) {
  const contentSecurityPolicy = response.headers.get('content-security-policy') ?? '';
  if (
    !contentSecurityPolicy.includes("frame-ancestors 'self'") ||
    response.headers.get('x-frame-options') !== 'SAMEORIGIN' ||
    response.headers.get('x-content-type-options') !== 'nosniff' ||
    response.headers.get('referrer-policy') !== 'strict-origin-when-cross-origin'
  ) {
    throw new Error(`Actual-image security headers are incomplete on ${surface}`);
  }
}

async function rawHttpStatus(
  baseUrl,
  path,
  headers,
  { body, method = 'GET' } = {}
) {
  const target = new URL(baseUrl);
  return await new Promise((resolve, reject) => {
    const request = httpRequest(
      {
        hostname: target.hostname,
        path,
        port: target.port,
        protocol: target.protocol,
        headers,
        method,
      },
      (response) => {
        response.resume();
        response.once('end', () => resolve(response.statusCode ?? 0));
      }
    );
    request.once('error', reject);
    request.end(body);
  });
}

async function readAuthMetadata(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/__navet_auth__/session`, {
      signal: AbortSignal.timeout(2_000),
    });
    const metadata = await response.json();
    const cookie = extractCookie(response, 'navet_auth_session');
    if (
      response.status !== 200 ||
      metadata?.authenticated !== false ||
      metadata?.providerId !== 'home_assistant' ||
      !/^nas_[a-f0-9]{32}$/.test(metadata?.sessionId) ||
      !cookie ||
      Object.hasOwn(metadata, 'access_token') ||
      Object.hasOwn(metadata, 'refresh_token')
    ) {
      return {
        error: `Unexpected auth metadata: ${JSON.stringify(metadata)}`,
        metadata: null,
      };
    }

    return { cookie, error: null, metadata };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Auth endpoint returned invalid JSON',
      metadata: null,
    };
  }
}

async function assertAnonymousProviderReadDoesNotMint(baseUrl, containerName, providerId) {
  const endpoint = `/__navet_${providerId}__/session`;
  const cookieName = `navet_${providerId}_session`;
  const response = await fetch(`${baseUrl}${endpoint}`);
  if (
    response.status !== 204 ||
    response.headers.get('set-cookie')?.includes(`${cookieName}=`)
  ) {
    throw new Error(`Anonymous ${providerId} GET minted a durable browser session`);
  }

  const files = spawnSync(
    'docker',
    [
      'exec',
      containerName,
      'find',
      `/data/navet-provider-sessions/${providerId}`,
      '-maxdepth',
      '1',
      '-name',
      '*.json',
      '-print',
    ],
    { stdio: 'pipe', encoding: 'utf8' }
  );
  if (files.stdout.trim()) {
    throw new Error(`Anonymous ${providerId} GET created a session file`);
  }
}

function readInstallationKey(containerName) {
  const result = spawnSync(
    'docker',
    ['exec', containerName, 'cat', '/data/navet-installation-key'],
    { stdio: 'pipe', encoding: 'utf8' }
  );
  const key = result.stdout.trim();
  if (
    result.error ||
    result.status !== 0 ||
    !/^[a-f0-9]{64}$/.test(key)
  ) {
    throw new Error('Actual image did not persist a valid installation key');
  }
  const mode = spawnSync(
    'docker',
    [
      'exec',
      containerName,
      'stat',
      '-c',
      '%a',
      '/data/navet-installation-key',
    ],
    { stdio: 'pipe', encoding: 'utf8' }
  ).stdout.trim();
  if (mode !== '600') {
    throw new Error(`Actual-image installation key has unsafe mode ${mode}`);
  }
  return key;
}

async function startHomeAssistantOAuth(
  baseUrl,
  containerName,
  browserSession,
  installationKey
) {
  const requestStart = (key) =>
    fetch(`${baseUrl}/__navet_auth__/authorize`, {
      method: 'POST',
      headers: {
        Cookie: browserSession.cookie,
        Origin: baseUrl,
        'Content-Type': 'application/json',
        'X-Navet-OAuth-Binding': browserSession.metadata.sessionId,
        ...(key ? { 'X-Navet-Installation-Key': key } : {}),
      },
      body: JSON.stringify({
        hassUrl: 'http://provider-check:8080/ha',
        returnTo: '/wall-panel?view=home&code=stale&state=stale#lights',
      }),
    });
  for (const rejectedKey of [null, 'b'.repeat(64)]) {
    const rejected = await requestStart(rejectedKey);
    if (rejected.status !== 403) {
      throw new Error(
        `Unknown Home Assistant target accepted ${
          rejectedKey ? 'an incorrect key' : 'without pairing'
        }`
      );
    }
  }
  const response = await requestStart(installationKey);
  if (response.status !== 200) {
    throw new Error(`Docker NJS OAuth authorize endpoint failed with ${response.status}`);
  }

  const payload = await response.json();
  const authorizeUrl = new URL(payload.authorizeUrl);
  const cookieId = browserSession.cookie.slice('navet_auth_session='.length);
  const pendingResult = spawnSync(
    'docker',
    [
      'exec',
      containerName,
      'cat',
      `/data/navet-auth-sessions/${cookieId}.json`,
    ],
    {
      stdio: 'pipe',
      encoding: 'utf8',
    }
  );
  const pendingSession =
    !pendingResult.error && pendingResult.status === 0
      ? JSON.parse(pendingResult.stdout)
      : null;
  if (
    authorizeUrl.origin !== 'http://provider-check:8080' ||
    authorizeUrl.pathname !== '/ha/auth/authorize' ||
    authorizeUrl.searchParams.get('response_type') !== 'code' ||
    authorizeUrl.searchParams.get('client_id') !== `${baseUrl}/` ||
    authorizeUrl.searchParams.get('redirect_uri') !==
      `${baseUrl}/__navet_auth__/callback` ||
    !/^[a-f0-9]{64}$/.test(authorizeUrl.searchParams.get('state') ?? '') ||
    pendingSession?.pending?.state !== authorizeUrl.searchParams.get('state') ||
    pendingSession?.pending?.returnTo !== '/wall-panel?view=home#lights' ||
    JSON.stringify(pendingSession).includes(installationKey)
  ) {
    throw new Error(`Unexpected Docker NJS OAuth authorize response: ${JSON.stringify(payload)}`);
  }
  return authorizeUrl.searchParams.get('state');
}

async function completeHomeAssistantOAuth(baseUrl, browserSession, state) {
  const response = await fetch(
    `${baseUrl}/__navet_auth__/callback?code=actual-image-code&state=${state}`,
    {
      headers: { Cookie: browserSession.cookie },
      redirect: 'manual',
    }
  );
  const cookie = extractCookie(response, 'navet_auth_session');
  if (
    response.status !== 302 ||
    !cookie ||
    cookie === browserSession.cookie ||
    response.headers.get('location') !==
      `${baseUrl}/wall-panel?view=home&navet_oauth_callback=1#lights`
  ) {
    throw new Error('Docker NJS OAuth callback did not rotate the browser session');
  }
  return cookie;
}

async function waitForAuthMetadata(baseUrl, containerName) {
  let lastError = 'Auth endpoint is not ready';
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const result = await readAuthMetadata(baseUrl);
    if (result.metadata) {
      return result;
    }
    lastError = result.error;
    await delay(250);
  }

  const logs = spawnSync('docker', ['logs', containerName], {
    stdio: 'pipe',
    encoding: 'utf8',
  });
  const diagnostic = [logs.stdout?.trim(), logs.stderr?.trim()].filter(Boolean).join('\n');
  throw new Error(diagnostic ? `${lastError}\n${diagnostic}` : lastError);
}

async function waitForProvider(containerName) {
  let lastError = 'Fake provider is not ready';
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const result = spawnSync(
      'docker',
      [
        'exec',
        containerName,
        'node',
        '-e',
        "fetch('http://127.0.0.1:8080/openhab/rest/items?recursive=false&limit=1').then((response) => { if (!response.ok) process.exit(1) })",
      ],
      { stdio: 'pipe', encoding: 'utf8' }
    );
    if (!result.error && result.status === 0) {
      return;
    }

    lastError = result.error?.message || result.stderr || result.stdout || lastError;
    await delay(200);
  }

  throw new Error(`Timed out waiting for the fake provider container: ${lastError.trim()}`);
}

function startNavetContainer(containerName, networkName, volumeName, imageTag) {
  run('docker', [
    'run',
    '-d',
    '--name',
    containerName,
    '--network',
    networkName,
    '--publish',
    '127.0.0.1::80',
    '--mount',
    `type=volume,source=${volumeName},target=/data`,
    '-e',
    'NAVET_HOMEY_CLIENT_ID=actual-image-homey-client',
    '-e',
    'NAVET_HOMEY_CLIENT_SECRET=actual-image-homey-secret',
    imageTag,
  ]);

  const portResult = spawnSync('docker', ['port', containerName, '80/tcp'], {
    stdio: 'pipe',
    encoding: 'utf8',
  });
  const portMatch = portResult.stdout.trim().match(/:(\d+)$/);
  if (portResult.error || portResult.status !== 0 || !portMatch) {
    throw new Error('Unable to resolve the actual-image published port');
  }
  return `http://127.0.0.1:${portMatch[1]}`;
}

async function startHomeyOAuth(baseUrl, installationKey) {
  const requestStart = (key) =>
    fetch(`${baseUrl}/__navet_homey__/authorize`, {
      method: 'POST',
      headers: {
        Origin: baseUrl,
        'Content-Type': 'application/json',
        ...(key ? { 'X-Navet-Installation-Key': key } : {}),
      },
      body: JSON.stringify({ returnTo: '/' }),
    });
  for (const rejectedKey of [null, 'b'.repeat(64)]) {
    const rejected = await requestStart(rejectedKey);
    if (
      rejected.status !== 403 ||
      rejected.headers.get('set-cookie')?.includes('navet_homey_session=')
    ) {
      throw new Error('Fresh Homey enrollment did not require operator pairing');
    }
  }
  const response = await requestStart(installationKey);
  const cookie = extractCookie(response, 'navet_homey_session');
  const body = await response.json();
  const state =
    typeof body?.authorizeUrl === 'string'
      ? new URL(body.authorizeUrl).searchParams.get('state')
      : '';
  if (
    response.status !== 200 ||
    !cookie ||
    !/^[a-f0-9]{64}$/.test(state ?? '')
  ) {
    throw new Error('Actual-image Homey OAuth start did not mint a pending session');
  }
  return cookie;
}

async function createOpenHABSession(baseUrl, installationKey) {
  const body = JSON.stringify({
      hassUrl: 'http://provider-check:8080/openhab',
      username: 'navet',
      password: 'actual-image-secret',
  });
  const requestLogin = (key) =>
    fetch(`${baseUrl}/__navet_openhab__/session`, {
      method: 'PUT',
      headers: {
        Origin: baseUrl,
        'Content-Type': 'application/json',
        ...(key ? { 'X-Navet-Installation-Key': key } : {}),
      },
      body,
    });
  for (const rejectedKey of [null, 'b'.repeat(64)]) {
    const rejected = await requestLogin(rejectedKey);
    if (
      rejected.status !== 403 ||
      rejected.headers.get('set-cookie')?.includes('navet_openhab_session=')
    ) {
      throw new Error('Fresh openHAB enrollment did not require operator pairing');
    }
  }
  const response = await requestLogin(installationKey);
  const responseBody = await response.text();
  const cookie = extractCookie(response, 'navet_openhab_session');
  if (response.status !== 200 || !cookie) {
    throw new Error(
      `Actual-image openHAB login through the runtime resolver failed with ${response.status}: ${responseBody}`
    );
  }

  const proxyResponse = await fetch(
    `${baseUrl}/__navet_openhab_proxy__/rest/items?recursive=false`,
    {
      headers: {
        Cookie: cookie,
        'X-Navet-Installation-Key': installationKey,
      },
    }
  );
  assertSecurityHeaders(proxyResponse, 'the openHAB proxy');
  if (
    proxyResponse.status !== 200 ||
    (await proxyResponse.text()) !== '[]' ||
    proxyResponse.headers.get('x-accel-redirect') ||
    proxyResponse.headers.get('location') ||
    proxyResponse.headers.get('www-authenticate') ||
    proxyResponse.headers.get('set-cookie')?.includes('attacker=')
  ) {
    throw new Error('Actual-image openHAB response-header confinement failed');
  }
  if (!extractCookie(proxyResponse, 'navet_openhab_session')) {
    throw new Error('Active openHAB proxy traffic did not slide its browser cookie');
  }

  for (const path of [
    '/rest/things',
    '/rest/items/Lamp%252f../../secret',
    '/rest/items/Lamp?unexpected=true',
  ]) {
    const isItemMutation = path.includes('items/Lamp');
    const blockedStatus = await rawHttpStatus(
      baseUrl,
      `/__navet_openhab_proxy__${path}`,
      {
        Cookie: cookie,
        Origin: baseUrl,
        ...(isItemMutation ? { 'Content-Type': 'text/plain' } : {}),
      },
      {
        body: isItemMutation ? 'ON' : undefined,
        method: isItemMutation ? 'POST' : 'GET',
      }
    );
    if (blockedStatus === 200) {
      throw new Error(`Forbidden openHAB proxy path reached upstream: ${path}`);
    }
  }
  return cookie;
}

async function verifyProfileColdBinding(baseUrl, authCookie) {
  const clientId = 'actual-image-panel-01';
  const request = (path, profileCookie = '') =>
    fetch(`${baseUrl}/__navet_profile__${path}`, {
      headers: {
        Cookie: [authCookie, profileCookie].filter(Boolean).join('; '),
        'X-Navet-Client-Id': clientId,
        'X-Navet-Client-Name': 'Actual image panel',
        'X-Navet-Client-Kind': 'wall_panel',
      },
    });
  const responses = await Promise.all([
    request('/default'),
    request('/preferences/client'),
    request('/clients'),
  ]);
  const bodies = await Promise.all(responses.map((response) => response.text()));
  const cookies = responses.map((response) =>
    extractCookie(response, 'navet_profile_client')
  );
  if (
    responses.some((response) => ![200, 204].includes(response.status)) ||
    bodies.some((body) => body.includes('client-binding-mismatch')) ||
    cookies.some((cookie) => !cookie) ||
    new Set(cookies).size !== 1
  ) {
    throw new Error('Parallel cold profile requests produced competing client bindings');
  }

  const profileCookie = cookies[0];
  for (const path of ['/default', '/preferences/client', '/clients']) {
    const replay = await request(path, profileCookie);
    const body = await replay.text();
    if (![200, 204].includes(replay.status) || body.includes('client-binding-mismatch')) {
      throw new Error(`Persisted profile client binding failed on ${path}`);
    }
  }

  const write = await fetch(`${baseUrl}/__navet_profile__/default`, {
    method: 'PUT',
    headers: {
      Cookie: `${authCookie}; ${profileCookie}`,
      Origin: baseUrl,
      'Content-Type': 'application/json',
      'X-Navet-Base-Revision': '0',
      'X-Navet-Changed-Paths': encodeURIComponent(
        JSON.stringify(['/dashboard/title'])
      ),
      'X-Navet-Client-Id': clientId,
      'X-Navet-Client-Name': 'Actual image panel',
      'X-Navet-Client-Kind': 'wall_panel',
    },
    body: JSON.stringify({
      app: 'navet',
      version: 3,
      exportedAt: '2026-07-29T00:00:00.000Z',
      dashboard: { title: 'Actual image profile' },
    }),
  });
  if (write.status !== 200) {
    throw new Error(`Actual-image profile write failed with ${write.status}`);
  }
  return profileCookie;
}

async function verifyPersistedStateAfterReplacement({
  authCookie,
  baseUrl,
  containerName,
  installationKey,
  openHABCookie,
  profileCookie,
}) {
  const persistedInstallationKey = readInstallationKey(containerName);
  if (persistedInstallationKey !== installationKey) {
    throw new Error('Container replacement generated a different installation key');
  }

  const authResponse = await fetch(`${baseUrl}/__navet_auth__/session`, {
    headers: { Cookie: authCookie },
  });
  const authMetadata = await authResponse.json();
  if (
    authResponse.status !== 200 ||
    authMetadata?.authenticated !== true ||
    Object.hasOwn(authMetadata, 'access_token') ||
    Object.hasOwn(authMetadata, 'refresh_token')
  ) {
    throw new Error('Home Assistant browser session did not survive container replacement');
  }

  const proxyResponse = await fetch(`${baseUrl}/__navet_ha_proxy__/api/states`, {
    headers: { Cookie: authCookie },
  });
  if (proxyResponse.status !== 200 || (await proxyResponse.text()) !== '[]') {
    throw new Error('Persisted Home Assistant session was unusable after container replacement');
  }

  const profileResponse = await fetch(`${baseUrl}/__navet_profile__/default`, {
    headers: {
      Cookie: `${authCookie}; ${profileCookie}`,
      'X-Navet-Client-Id': 'actual-image-panel-01',
      'X-Navet-Client-Name': 'Actual image panel',
      'X-Navet-Client-Kind': 'wall_panel',
    },
  });
  const profileBody = await profileResponse.text();
  if (profileResponse.status !== 200 || !profileBody.includes('Actual image profile')) {
    throw new Error('Dashboard profile did not survive container replacement');
  }

  const openHABResponse = await fetch(
    `${baseUrl}/__navet_openhab_proxy__/rest/items?recursive=false`,
    {
      headers: { Cookie: openHABCookie },
    }
  );
  if (openHABResponse.status !== 200 || (await openHABResponse.text()) !== '[]') {
    throw new Error('openHAB browser session did not survive container replacement');
  }

  const ownership = spawnSync(
    'docker',
    ['exec', containerName, 'find', '/data', '!', '-user', 'nginx', '-print'],
    { stdio: 'pipe', encoding: 'utf8' }
  );
  if (ownership.error || ownership.status !== 0 || ownership.stdout.trim()) {
    throw new Error(
      `Persistent data is not owned by the Nginx worker: ${ownership.stdout.trim()}`
    );
  }

  const replacementLogs = spawnSync('docker', ['logs', containerName], {
    stdio: 'pipe',
    encoding: 'utf8',
  });
  if (`${replacementLogs.stdout}\n${replacementLogs.stderr}`.includes('#navet_pairing=')) {
    throw new Error('Container replacement treated the persisted installation as new');
  }
}

const imageTag = `navet-docker-runtime-check:${Date.now()}`;
const expectedBuildVersion = '0.0.0-dev.20990101010101';
const containerName = `navet-docker-runtime-check-${process.pid}-${Date.now()}`;
const providerContainerName = `${containerName}-provider`;
const networkName = `${containerName}-network`;
const volumeName = `${containerName}-data`;
const providerServerSource = `
  const http = require('http');
  http.createServer((req, res) => {
    req.resume();
    if (req.headers['x-navet-installation-key']) {
      res.statusCode = 418;
      res.end('pairing header leaked');
      return;
    }
    if (req.url === '/ha/auth/token' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        access_token: 'actual-image-access',
        refresh_token: 'actual-image-refresh',
        expires_in: 3600
      }));
      return;
    }
    if (req.url === '/ha/api/states') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.end('[]');
      return;
    }
    if (req.url && req.url.startsWith('/openhab/rest/items')) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Set-Cookie', 'attacker=stolen');
      res.setHeader('Location', 'http://attacker.invalid/');
      res.setHeader('WWW-Authenticate', 'Basic realm="attacker"');
      res.setHeader('X-Accel-Redirect', '/config.js');
      res.end('[]');
      return;
    }
    res.statusCode = 404;
    res.end('not found');
  }).listen(8080, '0.0.0.0');
`;

try {
  ensureSerializedProfileRuntime();
  ensurePersistentDataConfiguration();
  ensureDockerAvailable();
  run(
    'docker',
    [
      'build',
      '--build-arg',
      'NAVET_ENABLE_DEMO=false',
      '--build-arg',
      `NAVET_BUILD_VERSION=${expectedBuildVersion}`,
      '-t',
      imageTag,
      '.',
    ],
    {
      cwd: process.cwd(),
    }
  );
  const imageVolumes = spawnSync(
    'docker',
    ['image', 'inspect', '--format', '{{json .Config.Volumes}}', imageTag],
    { stdio: 'pipe', encoding: 'utf8' }
  );
  if (
    imageVolumes.error ||
    imageVolumes.status !== 0 ||
    !Object.hasOwn(JSON.parse(imageVolumes.stdout), '/data')
  ) {
    throw new Error('Built standalone image does not declare /data as a volume');
  }
  run('docker', [
    'run',
    '--rm',
    '-e',
    'NAVET_HASS_URL=http://homeassistant.local:8123',
    '--tmpfs',
    '/data',
    imageTag,
    'nginx',
    '-t',
  ]);
  run('docker', ['volume', 'create', volumeName]);
  run('docker', ['network', 'create', networkName]);
  run('docker', [
    'run',
    '-d',
    '--name',
    providerContainerName,
    '--network',
    networkName,
    '--network-alias',
    'provider-check',
    'node:22-alpine',
    'node',
    '-e',
    providerServerSource,
  ]);
  await waitForProvider(providerContainerName);
  const baseUrl = startNavetContainer(containerName, networkName, volumeName, imageTag);
  assertBuiltStandaloneMetadata(containerName, expectedBuildVersion);

  const firstBrowser = await waitForAuthMetadata(baseUrl, containerName);
  const secondBrowser = await waitForAuthMetadata(baseUrl, containerName);
  const installationKey = readInstallationKey(containerName);
  const htmlResponse = await fetch(`${baseUrl}/`);
  assertSecurityHeaders(htmlResponse, 'the HTML shell');
  if ((await htmlResponse.text()).includes(installationKey)) {
    throw new Error('The installation key leaked into the HTML response');
  }
  const authApiResponse = await fetch(`${baseUrl}/__navet_auth__/session`, {
    headers: { Cookie: firstBrowser.cookie },
  });
  assertSecurityHeaders(authApiResponse, 'the auth API');
  if ((await authApiResponse.text()).includes(installationKey)) {
    throw new Error('The installation key leaked into the auth API response');
  }
  if (firstBrowser.metadata.sessionId === secondBrowser.metadata.sessionId) {
    throw new Error('Separate cookie-less requests received the same auth session ID');
  }
  const authFiles = spawnSync(
    'docker',
    [
      'exec',
      containerName,
      'find',
      '/data/navet-auth-sessions',
      '-maxdepth',
      '1',
      '-name',
      '*.json',
      '-print',
    ],
    { stdio: 'pipe', encoding: 'utf8' }
  );
  if (authFiles.stdout.trim()) {
    throw new Error('Anonymous Home Assistant metadata GET created a session record');
  }

  const fixedCookie = `navet_auth_session=${'a'.repeat(64)}`;
  const fixedCookieResponse = await fetch(`${baseUrl}/__navet_auth__/session`, {
    headers: { Cookie: fixedCookie },
  });
  if (extractCookie(fixedCookieResponse, 'navet_auth_session') === fixedCookie) {
    throw new Error('An unbacked caller-supplied auth cookie was not rotated');
  }

  const state = await startHomeAssistantOAuth(
    baseUrl,
    containerName,
    firstBrowser,
    installationKey
  );
  const authenticatedCookie = await completeHomeAssistantOAuth(
    baseUrl,
    firstBrowser,
    state
  );
  const oldCookieMetadata = await fetch(`${baseUrl}/__navet_auth__/session`, {
    headers: { Cookie: firstBrowser.cookie },
  }).then((response) => response.json());
  if (oldCookieMetadata.authenticated !== false) {
    throw new Error('The pre-login Home Assistant cookie remained authorized after rotation');
  }

  for (const origin of [null, 'http://sibling.navet.example']) {
    const blocked = await fetch(`${baseUrl}/__navet_ha_proxy__/api/states`, {
      method: 'POST',
      headers: {
        Cookie: authenticatedCookie,
        'Content-Type': 'application/json',
        ...(origin ? { Origin: origin } : {}),
      },
      body: '{}',
    });
    if (blocked.status !== 403) {
      throw new Error(`Cross-origin Home Assistant mutation was not blocked (${blocked.status})`);
    }
  }
  const allowedHaMutation = await fetch(
    `${baseUrl}/__navet_ha_proxy__/api/states`,
    {
      method: 'POST',
      headers: {
        Cookie: authenticatedCookie,
        Origin: baseUrl,
        'Content-Type': 'application/json',
        'X-Navet-Installation-Key': installationKey,
      },
      body: '{}',
    }
  );
  if (
    allowedHaMutation.status !== 200 ||
    allowedHaMutation.headers.get('access-control-allow-origin') ||
    allowedHaMutation.headers.get('access-control-allow-credentials') ||
    allowedHaMutation.headers.get('access-control-allow-headers')
  ) {
    throw new Error('Home Assistant proxy origin or CORS response confinement failed');
  }
  const blockedUpgrade = await rawHttpStatus(
    baseUrl,
    '/__navet_ha_proxy__/api/states',
    {
      Cookie: authenticatedCookie,
      Upgrade: 'h2c',
      Connection: 'upgrade',
    }
  );
  if (blockedUpgrade !== 403) {
    throw new Error(`Cross-origin provider upgrade was not blocked (${blockedUpgrade})`);
  }

  await assertAnonymousProviderReadDoesNotMint(baseUrl, containerName, 'homey');
  await assertAnonymousProviderReadDoesNotMint(baseUrl, containerName, 'openhab');
  const blockedHomeyMutation = await fetch(
    `${baseUrl}/__navet_homey_proxy__/api/manager/devices`,
    { method: 'POST' }
  );
  if (blockedHomeyMutation.status !== 403) {
    throw new Error(
      `Cross-origin Homey mutation was not blocked (${blockedHomeyMutation.status})`
    );
  }
  await startHomeyOAuth(baseUrl, installationKey);
  const openHABCookie = await createOpenHABSession(baseUrl, installationKey);
  const profileCookie = await verifyProfileColdBinding(baseUrl, authenticatedCookie);

  const dataFiles = spawnSync(
    'docker',
    ['exec', containerName, 'find', '/data', '-type', 'f', '-print'],
    { stdio: 'pipe', encoding: 'utf8' }
  ).stdout
    .split('\n')
    .map((value) => value.trim())
    .filter(
      (value) =>
        value && value !== '/data/navet-installation-key'
    );
  for (const file of dataFiles) {
    const contents = spawnSync(
      'docker',
      ['exec', containerName, 'cat', file],
      { stdio: 'pipe', encoding: 'utf8' }
    ).stdout;
    if (contents.includes(installationKey)) {
      throw new Error(`The installation key leaked into ${file}`);
    }
  }
  const runtimeLogs = spawnSync('docker', ['logs', containerName], {
    stdio: 'pipe',
    encoding: 'utf8',
  });
  const keyLogLines = `${runtimeLogs.stdout}\n${runtimeLogs.stderr}`
    .split('\n')
    .filter((line) => line.includes(installationKey));
  if (
    keyLogLines.length !== 1 ||
    !keyLogLines[0].includes(`#navet_pairing=${installationKey}`)
  ) {
    throw new Error('The installation key appeared outside its startup pairing instruction');
  }

  const resolverConfig = spawnSync(
    'docker',
    ['exec', containerName, 'cat', '/etc/nginx/resolver.conf'],
    { stdio: 'pipe', encoding: 'utf8' }
  ).stdout;
  const nginxConfig = spawnSync(
    'docker',
    ['exec', containerName, 'nginx', '-T'],
    { stdio: 'pipe', encoding: 'utf8' }
  ).stdout;
  if (
    !resolverConfig.includes('127.0.0.11') ||
    !nginxConfig.includes('proxy_ssl_verify on;') ||
    !nginxConfig.includes('proxy_ignore_headers X-Accel-Redirect') ||
    (
      nginxConfig.match(
        /proxy_set_header X-Navet-Installation-Key "";/g
      ) ?? []
    ).length < 5
  ) {
    throw new Error(
      'Runtime DNS, TLS verification, pairing-header stripping, or response confinement config is missing'
    );
  }

  run('docker', ['rm', '-f', containerName]);
  const replacementBaseUrl = startNavetContainer(
    containerName,
    networkName,
    volumeName,
    imageTag
  );
  await waitForAuthMetadata(replacementBaseUrl, containerName);
  await verifyPersistedStateAfterReplacement({
    authCookie: authenticatedCookie,
    baseUrl: replacementBaseUrl,
    containerName,
    installationKey,
    openHABCookie,
    profileCookie,
  });

  console.log(
    `Docker NJS auth smoke check passed with exact standalone build metadata, no anonymous record minting, OAuth rotation, runtime hostname resolution, provider confinement, stable parallel profile binding, and persisted auth/profile state after container replacement.`
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  spawnSync('docker', ['rm', '-f', containerName], {
    stdio: 'ignore',
  });
  spawnSync('docker', ['rm', '-f', providerContainerName], {
    stdio: 'ignore',
  });
  spawnSync('docker', ['network', 'rm', networkName], {
    stdio: 'ignore',
  });
  spawnSync('docker', ['volume', 'rm', '-f', volumeName], {
    stdio: 'ignore',
  });
  spawnSync('docker', ['image', 'rm', '-f', imageTag], {
    stdio: 'ignore',
  });
}
