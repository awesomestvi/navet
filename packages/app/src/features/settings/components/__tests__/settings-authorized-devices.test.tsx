import { getSettingsSectionStyles } from '@navet/app/features/settings/hooks/settings-section-styles';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsAuthorizedDevices } from '../settings-authorized-devices';

const authorizationMocks = vi.hoisted(() => ({
  approve: vi.fn(),
  decline: vi.fn(),
  list: vi.fn(),
  preview: vi.fn(),
  promote: vi.fn(),
  rename: vi.fn(),
  revoke: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: authorizationMocks.toastSuccess,
  },
}));

vi.mock('@navet/app/auth/device-authorization', () => ({
  approveDeviceAuthorization: authorizationMocks.approve,
  declineDeviceAuthorization: authorizationMocks.decline,
  listAuthorizedDevices: authorizationMocks.list,
  previewDeviceAuthorization: authorizationMocks.preview,
  promoteAuthorizedDevice: authorizationMocks.promote,
  renameAuthorizedDevice: authorizationMocks.rename,
  revokeAuthorizedDevice: authorizationMocks.revoke,
}));

describe('SettingsAuthorizedDevices', () => {
  const styles = getSettingsSectionStyles('glass', 'yellow');
  const primaryOverview = (devices: Array<Record<string, unknown>> = []) => ({
    access: 'primary',
    currentDeviceId: null,
    devices,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    authorizationMocks.list.mockResolvedValue(primaryOverview());
    authorizationMocks.preview.mockResolvedValue({
      code: '1234-5678-9abc',
      deviceName: 'Kitchen tablet',
      providers: ['home_assistant', 'openhab'],
      expiresAt: Date.now() + 300_000,
    });
    authorizationMocks.approve.mockResolvedValue(undefined);
    authorizationMocks.decline.mockResolvedValue(undefined);
    authorizationMocks.promote.mockResolvedValue(undefined);
    authorizationMocks.toastSuccess.mockReset();
    useSettingsStore.setState({
      language: 'en',
      use24HourTime: true,
      temperatureUnit: 'celsius',
    });
  });

  it('reviews the requesting screen and provider scope before manual approval', async () => {
    renderWithProviders(<SettingsAuthorizedDevices styles={styles} />);
    await screen.findByText('Primary sign-in · No other devices');

    fireEvent.change(screen.getByLabelText('Device connection code'), {
      target: { value: '1234-5678-9abc' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Review code' }));

    expect(await screen.findByText('Approve Kitchen tablet?')).toBeVisible();
    expect(
      screen.getByText('Access to Home Assistant, openHAB with its own revocable Navet session.')
    ).toBeVisible();
    expect(authorizationMocks.approve).not.toHaveBeenCalled();

    authorizationMocks.list.mockResolvedValueOnce(
      primaryOverview([
        {
          id: 'device-1',
          name: 'Kitchen tablet',
          role: 'authorized',
          providers: ['home_assistant', 'openhab'],
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
          expiresAt: Date.now() + 300_000,
        },
      ])
    );

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() =>
      expect(authorizationMocks.approve).toHaveBeenCalledWith('1234-5678-9abc', {
        language: 'en',
        use24HourTime: true,
        temperatureUnit: 'celsius',
      })
    );
    expect(authorizationMocks.toastSuccess).toHaveBeenCalledWith('The other screen was approved.');
    expect(await screen.findByText('Kitchen tablet')).toBeVisible();
  });

  it('capitalizes and groups a device connection code while it is typed', async () => {
    renderWithProviders(<SettingsAuthorizedDevices styles={styles} />);
    await screen.findByText('Primary sign-in · No other devices');

    const input = screen.getByLabelText('Device connection code');
    fireEvent.change(input, { target: { value: 'b52bb93x71ac4' } });

    expect(input).toHaveValue('B52B-B937-1AC4');
  });

  it('requires confirmation before removing an authorized device', async () => {
    authorizationMocks.list.mockResolvedValue(
      primaryOverview([
        {
          id: 'device-1',
          name: 'Kitchen tablet',
          role: 'authorized',
          providers: ['home_assistant'],
          createdAt: Date.now() - 10_000,
          lastActivityAt: Date.now(),
          expiresAt: Date.now() + 300_000,
        },
      ])
    );
    authorizationMocks.revoke.mockResolvedValue(undefined);
    renderWithProviders(<SettingsAuthorizedDevices styles={styles} />);

    await screen.findByText('Kitchen tablet');
    expect(screen.queryByRole('button', { name: 'Remove other devices' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Kitchen tablet' })).not.toBeInTheDocument();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'More actions: Kitchen tablet' }));
    expect(screen.getByRole('menuitem', { name: 'Make primary' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Rename device' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Remove device' }));

    expect(authorizationMocks.revoke).not.toHaveBeenCalled();
    expect(screen.getByText('Remove this authorized device?')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Remove device' }));

    await waitFor(() => expect(authorizationMocks.revoke).toHaveBeenCalledWith('device-1'));
    expect(screen.queryByText('Kitchen tablet')).not.toBeInTheDocument();
    expect(authorizationMocks.toastSuccess).toHaveBeenCalledWith('Kitchen tablet was removed.', {
      description: 'It can no longer open this Navet installation.',
    });
  });

  it('shows an authorized secondary device a read-only device roster', async () => {
    authorizationMocks.list.mockResolvedValue({
      access: 'authorized',
      currentDeviceId: 'device-1',
      devices: [
        {
          id: 'device-1',
          name: 'Kitchen tablet',
          role: 'authorized',
          providers: ['home_assistant'],
          createdAt: Date.now() - 10_000,
          lastActivityAt: Date.now(),
          expiresAt: Date.now() + 300_000,
        },
        {
          id: 'device-2',
          name: 'Hallway display',
          role: 'authorized',
          providers: ['home_assistant'],
          createdAt: Date.now() - 20_000,
          lastActivityAt: Date.now(),
          expiresAt: Date.now() + 300_000,
        },
      ],
    });

    renderWithProviders(<SettingsAuthorizedDevices styles={styles} />);

    expect(await screen.findByText('Managed by the primary device')).toBeVisible();
    expect(screen.getByText('Original sign-in')).toBeVisible();
    expect(screen.getByText('Kitchen tablet')).toBeVisible();
    expect(screen.getByText('Hallway display')).toBeVisible();
    expect(screen.getByText('Home Assistant · Current')).toBeVisible();
    expect(screen.getByText('Home Assistant · Active now')).toBeVisible();
    expect(screen.queryByText('Current')).not.toBeInTheDocument();
    expect(screen.queryByText('Connect another device')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rename device' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove / })).not.toBeInTheDocument();
  });

  it('shows migrated primary browsers as separate devices without a synthetic sign-in row', async () => {
    authorizationMocks.list.mockResolvedValue({
      access: 'primary',
      currentDeviceId: 'computer-device',
      devices: [
        {
          id: 'computer-device',
          name: 'Computer A1B2',
          role: 'primary',
          providers: ['home_assistant'],
          createdAt: Date.now() - 20_000,
          lastActivityAt: Date.now(),
          expiresAt: Date.now() + 300_000,
        },
        {
          id: 'phone-device',
          name: 'Phone C3D4',
          role: 'primary',
          providers: ['home_assistant'],
          createdAt: Date.now() - 10_000,
          lastActivityAt: Date.now(),
          expiresAt: Date.now() + 300_000,
        },
      ],
    });

    renderWithProviders(<SettingsAuthorizedDevices styles={styles} />);

    expect(await screen.findByText('Computer A1B2')).toBeVisible();
    expect(screen.getByText('Phone C3D4')).toBeVisible();
    expect(screen.getByText('Choose the primary device')).toBeVisible();
    expect(
      screen.getByText(
        'These sign-ins were migrated as primary devices. Choose which device should manage the others.'
      )
    ).toBeVisible();
    expect(screen.queryByText('Original sign-in')).not.toBeInTheDocument();
    const primaryBadges = screen.getAllByText('Primary');
    expect(primaryBadges).toHaveLength(2);
    expect(screen.getByText('Home Assistant · Current')).toBeVisible();
    expect(screen.queryByText('Current')).not.toBeInTheDocument();
    expect(primaryBadges[0]).toHaveClass('rounded-full', 'border', 'px-2', 'py-0.5', 'text-[10px]');

    fireEvent.pointerDown(screen.getByRole('button', { name: 'More actions: Computer A1B2' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Make primary' }));
    fireEvent.click(screen.getByRole('button', { name: 'Make primary' }));

    await waitFor(() => expect(authorizationMocks.promote).toHaveBeenCalledWith('computer-device'));
    expect(screen.getAllByText('Primary')).toHaveLength(1);
    expect(screen.queryByText('Choose the primary device')).not.toBeInTheDocument();
  });

  it('opens device editing from the overflow menu and saves the new name', async () => {
    authorizationMocks.list.mockResolvedValue(
      primaryOverview([
        {
          id: 'device-1',
          name: 'Kitchen tablet',
          role: 'primary',
          providers: ['home_assistant'],
          createdAt: Date.now() - 10_000,
          lastActivityAt: Date.now(),
          expiresAt: Date.now() + 300_000,
        },
      ])
    );
    authorizationMocks.rename.mockResolvedValue(undefined);

    renderWithProviders(<SettingsAuthorizedDevices styles={styles} />);
    await screen.findByText('Kitchen tablet');
    fireEvent.pointerDown(screen.getByRole('button', { name: 'More actions: Kitchen tablet' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename device' }));

    const input = screen.getByRole('textbox', { name: 'Device name' });
    fireEvent.change(input, { target: { value: 'Kitchen wall tablet' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save device name' }));

    await waitFor(() =>
      expect(authorizationMocks.rename).toHaveBeenCalledWith('device-1', 'Kitchen wall tablet')
    );
    expect(screen.getByText('Kitchen wall tablet')).toBeVisible();
  });

  it('lets a primary sign-in promote an authorized device', async () => {
    authorizationMocks.list.mockResolvedValue({
      access: 'primary',
      currentDeviceId: 'primary-device',
      devices: [
        {
          id: 'primary-device',
          name: 'Primary screen',
          role: 'primary',
          providers: ['home_assistant'],
          createdAt: Date.now() - 20_000,
          lastActivityAt: Date.now(),
          expiresAt: Date.now() + 300_000,
        },
        {
          id: 'device-1',
          name: 'Kitchen tablet',
          role: 'authorized',
          providers: ['home_assistant'],
          createdAt: Date.now() - 10_000,
          lastActivityAt: Date.now(),
          expiresAt: Date.now() + 300_000,
        },
      ],
    });

    renderWithProviders(<SettingsAuthorizedDevices styles={styles} />);
    await screen.findByText('Kitchen tablet');
    fireEvent.pointerDown(screen.getByRole('button', { name: 'More actions: Kitchen tablet' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Make primary' }));

    expect(authorizationMocks.promote).not.toHaveBeenCalled();
    expect(screen.getByText('Make this a primary device?')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Make primary' }));

    await waitFor(() => expect(authorizationMocks.promote).toHaveBeenCalledWith('device-1'));
    expect(screen.getAllByText('Primary')).toHaveLength(1);
    expect(screen.getByText('Managed by the primary device')).toBeVisible();
    expect(authorizationMocks.toastSuccess).toHaveBeenCalledWith(
      'Kitchen tablet is now a primary device.',
      { description: 'It can connect, rename, and remove authorized devices.' }
    );
  });
});
