import { useSettingsStore } from '@navet/app/stores/settings-store';
import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeviceApprovalPrompt } from '../device-approval-prompt';

const { approveMock, declineMock, previewMock } = vi.hoisted(() => ({
  approveMock: vi.fn(),
  declineMock: vi.fn(),
  previewMock: vi.fn(),
}));

vi.mock('@navet/app/auth/device-authorization', () => ({
  approveDeviceAuthorization: approveMock,
  declineDeviceAuthorization: declineMock,
  previewDeviceAuthorization: previewMock,
}));

describe('DeviceApprovalPrompt', () => {
  beforeEach(() => {
    approveMock.mockReset().mockResolvedValue(undefined);
    declineMock.mockReset().mockResolvedValue(undefined);
    previewMock.mockReset().mockResolvedValue({
      code: '1234-5678-9abc',
      deviceName: 'Kitchen tablet',
      providers: ['home_assistant', 'openhab'],
      expiresAt: Date.now() + 300_000,
    });
    useSettingsStore.setState({
      language: 'en',
      use24HourTime: true,
      temperatureUnit: 'celsius',
    });
    window.history.replaceState({}, '', '/#navet_device_code=1234-5678-9abc');
  });

  it('shows the exact requesting screen and provider scope before approval', async () => {
    renderWithProviders(<DeviceApprovalPrompt />);

    expect(await screen.findByText('Requesting screen: Kitchen tablet')).toBeVisible();
    expect(screen.getByText('Connections: home_assistant, openhab')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Approve device' }));

    await waitFor(() =>
      expect(approveMock).toHaveBeenCalledWith('1234-5678-9abc', {
        language: 'en',
        use24HourTime: true,
        temperatureUnit: 'celsius',
      })
    );
    expect(window.location.hash).not.toContain('navet_device_code');
  });

  it('requires an explicit decline action and consumes the fragment code', async () => {
    renderWithProviders(<DeviceApprovalPrompt />);
    await screen.findByText('Kitchen tablet', { exact: false });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(declineMock).toHaveBeenCalledWith('1234-5678-9abc'));
    expect(window.location.hash).not.toContain('navet_device_code');
  });
});
