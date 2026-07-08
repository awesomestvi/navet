import { useSettingsSectionController } from '@navet/app/features/settings/hooks/use-settings-section-controller';
import { renderWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsExperimentalSection } from '../settings-experimental-section';

const { isDevOrLocalBuildMock } = vi.hoisted(() => ({
  isDevOrLocalBuildMock: vi.fn(() => true),
}));

vi.mock('@navet/app/constants/app-build-metadata', () => ({
  isDevOrLocalBuild: isDevOrLocalBuildMock,
}));

function TestSection({
  localHabitsTabEnabled = false,
  onLocalHabitsTabEnabledChange = vi.fn(),
}: {
  localHabitsTabEnabled?: boolean;
  onLocalHabitsTabEnabledChange?: (enabled: boolean) => void;
}) {
  const controller = useSettingsSectionController();
  return (
    <SettingsExperimentalSection
      controller={controller}
      localHabitsTabEnabled={localHabitsTabEnabled}
      onLocalHabitsTabEnabledChange={onLocalHabitsTabEnabledChange}
    />
  );
}

describe('SettingsExperimentalSection', () => {
  beforeEach(async () => {
    await resetAppStores();
    isDevOrLocalBuildMock.mockReturnValue(true);
  });

  it('shows a local habits tab toggle in dev and local builds', () => {
    const onLocalHabitsTabEnabledChange = vi.fn();
    renderWithProviders(
      <TestSection onLocalHabitsTabEnabledChange={onLocalHabitsTabEnabledChange} />
    );

    expect(screen.getByRole('heading', { name: 'Experimental' })).toBeInTheDocument();
    const localHabitsGroup = screen.getByRole('group', { name: 'Local habits' });
    fireEvent.click(within(localHabitsGroup).getByRole('button', { name: 'On' }));

    expect(onLocalHabitsTabEnabledChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole('group', { name: 'Enable local habits' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Keep device awake' })).not.toBeInTheDocument();
  });

  it('hides local habits in beta and stable builds', () => {
    isDevOrLocalBuildMock.mockReturnValue(false);

    renderWithProviders(<TestSection />);

    expect(screen.getByRole('heading', { name: 'Experimental' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Enable local habits' })).not.toBeInTheDocument();
  });
});
