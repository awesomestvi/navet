import { useSettingsStore } from '@navet/app/stores/settings-store';
import { renderWithProviders } from '@navet/app/test/render';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeviceConnectionPanel } from '../device-connection-panel';

const authorizationMocks = vi.hoisted(() => ({
  create: vi.fn(),
  load: vi.fn(),
  redeem: vi.fn(),
}));

vi.mock('@navet/app/auth/device-authorization', () => ({
  createDeviceAuthorizationRequest: authorizationMocks.create,
  loadDeviceAuthorizationState: authorizationMocks.load,
  redeemDeviceAuthorization: authorizationMocks.redeem,
}));

describe('DeviceConnectionPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authorizationMocks.create.mockResolvedValue({
      id: 'a'.repeat(32),
      requesterSecret: 'b'.repeat(64),
      code: '1234-5678-9abc',
      expiresAt: Date.now() + 300_000,
    });
    authorizationMocks.load.mockResolvedValue({
      id: 'a'.repeat(32),
      state: 'approved',
      expiresAt: Date.now() + 300_000,
    });
    useSettingsStore.setState({
      language: 'en',
      use24HourTime: false,
      temperatureUnit: 'fahrenheit',
    });
    authorizationMocks.redeem.mockResolvedValue({
      preferences: {
        language: 'sv',
        use24HourTime: true,
        temperatureUnit: 'celsius',
      },
    });
  });

  it('finishes connecting after an approved request is redeemed', async () => {
    const onConnected = vi.fn();
    renderWithProviders(<DeviceConnectionPanel onConnected={onConnected} onSignIn={vi.fn()} />);

    expect(await screen.findByText('Connecting this device…')).toBeVisible();
    await waitFor(() => expect(authorizationMocks.redeem).toHaveBeenCalledOnce());
    expect(onConnected).toHaveBeenCalledOnce();
    expect(useSettingsStore.getState()).toMatchObject({
      language: 'sv',
      use24HourTime: true,
      temperatureUnit: 'celsius',
    });
  });
});
