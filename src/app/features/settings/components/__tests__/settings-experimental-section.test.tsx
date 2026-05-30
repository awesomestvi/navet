import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsSectionController } from '@/app/features/settings/hooks/use-settings-section-controller';
import { useSettingsStore } from '@/app/stores';
import { renderWithProviders } from '@/test/render';
import { resetAppStores } from '@/test/store-reset';
import { SettingsExperimentalSection } from '../settings-experimental-section';

const { activateFallbackMock, useKeepDeviceAwakeSnapshotMock } = vi.hoisted(() => ({
  activateFallbackMock: vi.fn(),
  useKeepDeviceAwakeSnapshotMock: vi.fn(),
}));

vi.mock('@/app/hooks/use-keep-device-awake', () => ({
  activateKeepDeviceAwakeFallback: activateFallbackMock,
  useKeepDeviceAwakeSnapshot: useKeepDeviceAwakeSnapshotMock,
}));

function TestSection() {
  const controller = useSettingsSectionController();
  return <SettingsExperimentalSection controller={controller} />;
}

describe('SettingsExperimentalSection', () => {
  beforeEach(async () => {
    await resetAppStores();
    activateFallbackMock.mockReset();
    useKeepDeviceAwakeSnapshotMock.mockReturnValue({
      enabled: false,
      mode: 'disabled',
      canActivateFallback: false,
    });
  });

  it('updates the keep-awake setting from the experimental settings toggle', () => {
    renderWithProviders(<TestSection />);

    const keepAwakeGroup = screen.getByRole('group', { name: 'Keep device awake' });
    fireEvent.click(within(keepAwakeGroup).getByRole('button', { name: 'On' }));

    expect(useSettingsStore.getState().keepDeviceAwake).toBe(true);
  });

  it('keeps the caveat visible while the setting is off', () => {
    renderWithProviders(<TestSection />);

    expect(
      screen.getByText(
        'Navet first requests browser wake lock, then falls back to silent audio if needed.'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        'Best effort only. Navet keeps retrying, but some embedded browsers and low-power displays may still sleep or block autoplay.'
      )
    ).not.toBeInTheDocument();
  });

  it('renders the pending-activation status and activation action when needed', () => {
    useKeepDeviceAwakeSnapshotMock.mockReturnValue({
      enabled: true,
      mode: 'pending-activation',
      canActivateFallback: true,
    });
    useSettingsStore.getState().updateSettings({ keepDeviceAwake: true });

    renderWithProviders(<TestSection />);

    expect(
      screen.getByText('Waiting for the next interaction to restart fallback audio automatically')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Tap to activate fallback audio' })
    ).toBeInTheDocument();
  });

  it('calls manual fallback activation only when the action is shown', () => {
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
});
