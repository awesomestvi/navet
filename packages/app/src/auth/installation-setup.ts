import type { IntegrationProviderId } from '@navet/core';
import { getInstallationPairingHeaders } from './installation-pairing';

export type InstallationSetupState = 'ready' | 'approval_required' | 'unavailable';

export interface InstallationSetupStatus {
  providerId: IntegrationProviderId;
  state: InstallationSetupState;
  authorization: 'trusted_runtime' | 'setup_proof' | 'approved_connection' | 'none';
}

function isSetupStatus(value: unknown): value is InstallationSetupStatus {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const status = value as Partial<InstallationSetupStatus>;
  return (
    typeof status.providerId === 'string' &&
    (status.state === 'ready' ||
      status.state === 'approval_required' ||
      status.state === 'unavailable') &&
    (status.authorization === 'trusted_runtime' ||
      status.authorization === 'setup_proof' ||
      status.authorization === 'approved_connection' ||
      status.authorization === 'none')
  );
}

export async function fetchInstallationSetupStatus(
  providerId: IntegrationProviderId,
  signal?: AbortSignal
): Promise<InstallationSetupStatus> {
  const response = await fetch(
    `/__navet_auth__/setup?providerId=${encodeURIComponent(providerId)}`,
    {
      cache: 'no-store',
      credentials: 'same-origin',
      headers: getInstallationPairingHeaders(),
      signal,
    }
  );
  if (!response.ok) {
    throw new Error('Navet could not check whether this connection is ready');
  }
  const status: unknown = await response.json();
  if (!isSetupStatus(status) || status.providerId !== providerId) {
    throw new Error('Navet received an invalid setup response');
  }
  return status;
}

export async function approveInstallationSetup(code: string): Promise<void> {
  const response = await fetch('/__navet_auth__/setup', {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (response.ok) {
    return;
  }
  let message = 'That setup code is invalid, expired, or already used.';
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === 'string' && body.error) {
      message = body.error;
    }
  } catch {
    // Keep the actionable fallback when the server did not return JSON.
  }
  throw new Error(message);
}
