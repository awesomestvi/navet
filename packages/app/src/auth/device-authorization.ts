import { type AppLanguage, isSupportedLanguage } from '@navet/app/i18n/config';

export interface DeviceAuthorizationRequest {
  id: string;
  requesterSecret: string;
  code: string;
  expiresAt: number;
}

export interface DevicePairingPreferences {
  language: AppLanguage;
  use24HourTime: boolean;
  temperatureUnit: 'celsius' | 'fahrenheit';
}

export interface DeviceAuthorizationRedemption {
  preferences: DevicePairingPreferences | null;
}

function parseDevicePairingPreferences(value: unknown): DevicePairingPreferences | null {
  if (!value || typeof value !== 'object') return null;
  const preferences = value as Record<string, unknown>;
  if (
    typeof preferences.language !== 'string' ||
    !isSupportedLanguage(preferences.language) ||
    typeof preferences.use24HourTime !== 'boolean' ||
    (preferences.temperatureUnit !== 'celsius' && preferences.temperatureUnit !== 'fahrenheit')
  ) {
    return null;
  }
  return {
    language: preferences.language,
    use24HourTime: preferences.use24HourTime,
    temperatureUnit: preferences.temperatureUnit,
  };
}

export type DeviceAuthorizationState = 'pending' | 'approved' | 'declined' | 'expired' | 'redeemed';

export interface AuthorizedDevice {
  id: string;
  name: string;
  role: 'primary' | 'authorized';
  providers: string[];
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
}

export interface AuthorizedDeviceOverview {
  access: 'primary' | 'authorized';
  currentDeviceId: string | null;
  devices: AuthorizedDevice[];
}

export interface DeviceAuthorizationPreview {
  code: string;
  deviceName: string;
  providers: string[];
  expiresAt: number;
}

export async function canConnectFromAuthorizedDevice(signal?: AbortSignal): Promise<boolean> {
  const response = await fetch('/__navet_devices__/availability', {
    cache: 'no-store',
    credentials: 'same-origin',
    signal,
  });
  if (!response.ok) {
    throw new Error('Navet could not check for an authorized device.');
  }
  const body: unknown = await response.json();
  if (
    !body ||
    typeof body !== 'object' ||
    typeof (body as { available?: unknown }).available !== 'boolean'
  ) {
    throw new Error('Navet received an invalid device availability response.');
  }
  return (body as { available: boolean }).available;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: 'no-store',
    credentials: 'same-origin',
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
  });
  if (!response.ok) {
    let message = 'Navet could not connect this device.';
    try {
      const body = (await response.json()) as { error?: unknown };
      if (typeof body.error === 'string' && body.error) {
        message = body.error;
      }
    } catch {
      // Keep the stable fallback for non-JSON proxy failures.
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export function createDeviceAuthorizationRequest(
  deviceName?: string
): Promise<DeviceAuthorizationRequest> {
  return requestJson('/__navet_devices__/request', {
    method: 'POST',
    body: JSON.stringify({
      deviceName: deviceName ?? `Navet on ${navigator.platform || 'another screen'}`,
    }),
  });
}

export function loadDeviceAuthorizationState(request: DeviceAuthorizationRequest) {
  return requestJson<{ id: string; state: DeviceAuthorizationState; expiresAt: number }>(
    `/__navet_devices__/request?id=${encodeURIComponent(request.id)}&secret=${encodeURIComponent(
      request.requesterSecret
    )}`
  );
}

export async function redeemDeviceAuthorization(
  request: DeviceAuthorizationRequest
): Promise<DeviceAuthorizationRedemption> {
  const response = await requestJson<{ preferences?: unknown }>('/__navet_devices__/redeem', {
    method: 'POST',
    body: JSON.stringify({ id: request.id, requesterSecret: request.requesterSecret }),
  });
  return { preferences: parseDevicePairingPreferences(response.preferences) };
}

export function approveDeviceAuthorization(
  code: string,
  preferences: DevicePairingPreferences,
  deviceName?: string
): Promise<void> {
  return requestJson('/__navet_devices__/approve', {
    method: 'POST',
    body: JSON.stringify({ code, deviceName, preferences }),
  }).then(() => undefined);
}

export function previewDeviceAuthorization(code: string): Promise<DeviceAuthorizationPreview> {
  return requestJson('/__navet_devices__/preview', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export function declineDeviceAuthorization(code: string): Promise<void> {
  return requestJson('/__navet_devices__/deny', {
    method: 'POST',
    body: JSON.stringify({ code }),
  }).then(() => undefined);
}

export function listAuthorizedDevices(): Promise<AuthorizedDeviceOverview> {
  return requestJson<AuthorizedDeviceOverview>('/__navet_devices__/sessions');
}

export function revokeAuthorizedDevice(id: string): Promise<void> {
  return requestJson('/__navet_devices__/sessions', {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  }).then(() => undefined);
}

export function renameAuthorizedDevice(id: string, name: string): Promise<void> {
  return requestJson('/__navet_devices__/sessions', {
    method: 'PATCH',
    body: JSON.stringify({ id, name }),
  }).then(() => undefined);
}

export function promoteAuthorizedDevice(id: string): Promise<void> {
  return requestJson('/__navet_devices__/sessions', {
    method: 'PATCH',
    body: JSON.stringify({ id, role: 'primary' }),
  }).then(() => undefined);
}

export async function invalidateAuthorizedProvider(providerId: string): Promise<void> {
  const response = await fetch('/__navet_devices__/providers', {
    method: 'DELETE',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providerId }),
  });
  if (response.status === 404 || response.status === 405) return;
  if (!response.ok) throw new Error('Navet could not revoke this provider from other devices.');
}
