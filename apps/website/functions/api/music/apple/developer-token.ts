interface AppleMusicTokenEnvironment {
  APPLE_MUSIC_KEY_ID?: string;
  APPLE_MUSIC_PRIVATE_KEY?: string;
  APPLE_MUSIC_TEAM_ID?: string;
}

interface PagesFunctionContext {
  env: AppleMusicTokenEnvironment;
}

const TOKEN_LIFETIME_SECONDS = 30 * 24 * 60 * 60;
const APPLE_IDENTIFIER_PATTERN = /^[a-zA-Z0-9]{10}$/;
const RESPONSE_SECURITY_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'X-Content-Type-Options': 'nosniff',
} as const;

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function encodeJson(value: unknown): string {
  return base64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function decodePrivateKey(privateKey: string): ArrayBuffer {
  const normalized = privateKey.replace(/\\n/g, '\n');
  const encoded = normalized
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  if (!encoded) throw new Error('Apple Music private key is missing');
  const binary = atob(encoded);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return buffer;
}

export async function createAppleMusicDeveloperToken(
  environment: AppleMusicTokenEnvironment,
  issuedAt = Math.floor(Date.now() / 1000)
): Promise<{ developerToken: string; expiresAt: string }> {
  const teamId = environment.APPLE_MUSIC_TEAM_ID?.trim() ?? '';
  const keyId = environment.APPLE_MUSIC_KEY_ID?.trim() ?? '';
  const privateKey = environment.APPLE_MUSIC_PRIVATE_KEY?.trim() ?? '';
  if (!APPLE_IDENTIFIER_PATTERN.test(teamId) || !APPLE_IDENTIFIER_PATTERN.test(keyId) || !privateKey) {
    throw new Error('Apple Music token service is not configured');
  }

  const expiresAt = issuedAt + TOKEN_LIFETIME_SECONDS;
  const header = encodeJson({ alg: 'ES256', kid: keyId, typ: 'JWT' });
  const payload = encodeJson({ iss: teamId, iat: issuedAt, exp: expiresAt });
  const signingInput = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    decodePrivateKey(privateKey),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      new TextEncoder().encode(signingInput)
    )
  );

  return {
    developerToken: `${signingInput}.${base64Url(signature)}`,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
  };
}

export async function onRequestGet(context: PagesFunctionContext): Promise<Response> {
  try {
    const payload = await createAppleMusicDeveloperToken(context.env);
    return Response.json(payload, {
      headers: {
        ...RESPONSE_SECURITY_HEADERS,
        'Cache-Control': 'public, max-age=3600',
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch {
    return Response.json(
      { error: 'Navet Apple Music authorization is unavailable' },
      {
        status: 503,
        headers: {
          ...RESPONSE_SECURITY_HEADERS,
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  }
}
