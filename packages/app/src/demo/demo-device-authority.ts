import type {
  AuthorizedDevice,
  AuthorizedDeviceOverview,
  DeviceAuthorizationPreview,
} from '@navet/app/auth/device-authorization';

const SAMPLE_CODE = 'A1B2-C3D4-E5F6';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Keep the public demo's device roster local to this browser, with no real Navet sessions. */
export function installDemoDeviceAuthority() {
  const originalFetch = window.fetch;
  const now = Date.now();
  const devices: AuthorizedDevice[] = [
    {
      id: 'demo-wall-display',
      name: 'Kitchen wall display',
      role: 'authorized',
      providers: ['home_assistant'],
      createdAt: now - 14 * 86_400_000,
      lastActivityAt: now - 2 * 60_000,
      expiresAt: now + 30 * 86_400_000,
    },
  ];

  window.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.href);
    if (!url.pathname.startsWith('/__navet_devices__/')) {
      return originalFetch(input, init);
    }

    const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined)
    );
    const currentDeviceId = headers.get('X-Navet-Device-Client-Id') ?? 'demo-primary-device';
    const currentDeviceName = decodeURIComponent(
      headers.get('X-Navet-Device-Name') ?? 'This device'
    );

    if (url.pathname === '/__navet_devices__/availability') {
      return jsonResponse({ available: true });
    }
    if (url.pathname === '/__navet_devices__/sessions') {
      if (method === 'DELETE') {
        const index = devices.findIndex((device) => device.id === body.id);
        if (index >= 0) devices.splice(index, 1);
        return jsonResponse({});
      }
      if (method === 'PATCH') {
        const device = devices.find((item) => item.id === body.id);
        if (device) {
          if (typeof body.name === 'string') device.name = body.name;
          if (body.role === 'primary') device.role = 'primary';
        }
        return jsonResponse({});
      }
      const overview: AuthorizedDeviceOverview = {
        access: 'primary',
        currentDeviceId,
        devices: [
          {
            id: currentDeviceId,
            name: currentDeviceName,
            role: 'primary',
            providers: ['home_assistant'],
            createdAt: now - 21 * 86_400_000,
            lastActivityAt: Date.now(),
            expiresAt: now + 30 * 86_400_000,
          },
          ...devices,
        ],
      };
      return jsonResponse(overview);
    }
    if (url.pathname === '/__navet_devices__/preview') {
      if (String(body.code).toUpperCase() !== SAMPLE_CODE) {
        return jsonResponse({ error: 'Unknown sample code' }, 404);
      }
      const preview: DeviceAuthorizationPreview = {
        code: SAMPLE_CODE,
        deviceName: 'Guest room tablet',
        providers: ['home_assistant'],
        expiresAt: Date.now() + 10 * 60_000,
      };
      return jsonResponse(preview);
    }
    if (url.pathname === '/__navet_devices__/approve') {
      if (String(body.code).toUpperCase() === SAMPLE_CODE) {
        devices.push({
          id: 'demo-guest-tablet',
          name: 'Guest room tablet',
          role: 'authorized',
          providers: ['home_assistant'],
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
          expiresAt: Date.now() + 30 * 86_400_000,
        });
      }
      return jsonResponse({});
    }
    if (url.pathname === '/__navet_devices__/deny') {
      return jsonResponse({});
    }
    return jsonResponse({ error: 'Unavailable in the sample demo' }, 404);
  };

  return () => {
    window.fetch = originalFetch;
  };
}
