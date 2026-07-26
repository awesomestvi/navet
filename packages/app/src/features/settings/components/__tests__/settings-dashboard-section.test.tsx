import { useSettingsSectionController } from '@navet/app/features/settings/hooks/use-settings-section-controller';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { renderWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsDashboardSection } from '../settings-dashboard-section';

const { activateFallbackMock, useKeepDeviceAwakeSnapshotMock } = vi.hoisted(() => ({
  activateFallbackMock: vi.fn(),
  useKeepDeviceAwakeSnapshotMock: vi.fn(),
}));

vi.mock('@navet/app/hooks/use-keep-device-awake', () => ({
  activateKeepDeviceAwakeFallback: activateFallbackMock,
  useKeepDeviceAwakeSnapshot: useKeepDeviceAwakeSnapshotMock,
}));

function TestSection() {
  const controller = useSettingsSectionController();
  return <SettingsDashboardSection controller={controller} />;
}

describe('SettingsDashboardSection', () => {
  beforeEach(async () => {
    await resetAppStores();
    activateFallbackMock.mockReset();
    useKeepDeviceAwakeSnapshotMock.mockReturnValue({
      enabled: false,
      mode: 'disabled',
      canActivateFallback: false,
    });
  });

  it('updates the keep-awake setting from dashboard settings', () => {
    renderWithProviders(<TestSection />);

    const keepAwakeGroup = screen.getByRole('group', { name: 'Keep device awake' });
    fireEvent.click(within(keepAwakeGroup).getByRole('button', { name: 'On' }));

    expect(useSettingsStore.getState().keepDeviceAwake).toBe(true);
  });

  it('renders the pending keep-awake fallback action when needed', () => {
    useKeepDeviceAwakeSnapshotMock.mockReturnValue({
      enabled: true,
      mode: 'pending-activation',
      canActivateFallback: true,
    });
    useSettingsStore.getState().updateSettings({ keepDeviceAwake: true });

    renderWithProviders(<TestSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Tap to activate fallback audio' }));

    expect(activateFallbackMock).toHaveBeenCalledTimes(1);
  });

  it('switches header title mode and shows the custom text input only for custom mode', () => {
    renderWithProviders(<TestSection />);

    expect(screen.queryByPlaceholderText('Welcome home')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Custom text' }));

    const input = screen.getByPlaceholderText('Welcome home');
    expect(input).toBeInTheDocument();
    expect(useSettingsStore.getState().headerTitleMode).toBe('custom_text');

    fireEvent.change(input, { target: { value: 'Dinner soon' } });

    expect(useSettingsStore.getState().headerCustomText).toBe('Dinner soon');

    fireEvent.click(screen.getByRole('button', { name: 'Date & Time' }));

    expect(useSettingsStore.getState().headerTitleMode).toBe('clock');
    expect(screen.queryByPlaceholderText('Welcome home')).not.toBeInTheDocument();
  });

  it('applies dashboard profile presets through scoped settings', () => {
    renderWithProviders(<TestSection />);

    const profileGroup = screen.getByRole('group', { name: 'Dashboard profile' });
    expect(within(profileGroup).queryByRole('button', { name: 'Bedside' })).not.toBeInTheDocument();
    fireEvent.click(within(profileGroup).getByRole('button', { name: 'Wall display' }));

    expect(useSettingsStore.getState()).toEqual(
      expect.objectContaining({
        dashboardProfileMode: 'wall_display',
        dashboardSpaceMode: 'more_space',
        headerTitleMode: 'clock',
        keepDeviceAwake: true,
        kioskMode: true,
        showHomeSummaryBar: true,
      })
    );
    expect(screen.getByText(/Enables kiosk mode/)).toBeInTheDocument();
  });

  it('does not render space usage controls in dashboard settings', () => {
    renderWithProviders(<TestSection />);

    expect(screen.queryByText('Space usage')).not.toBeInTheDocument();
  });
});
