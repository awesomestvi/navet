import { useSettingsSectionController } from '@navet/app/features/settings/hooks/use-settings-section-controller';
import { renderWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsExperimentalSection } from '../settings-experimental-section';

function TestSection({
  localHabitsEnabled = false,
  onLocalHabitsEnabledChange = vi.fn(),
}: {
  localHabitsEnabled?: boolean;
  onLocalHabitsEnabledChange?: (enabled: boolean) => void;
}) {
  const controller = useSettingsSectionController();
  return (
    <SettingsExperimentalSection
      controller={controller}
      localHabitsEnabled={localHabitsEnabled}
      onLocalHabitsEnabledChange={onLocalHabitsEnabledChange}
    />
  );
}

describe('SettingsExperimentalSection', () => {
  beforeEach(async () => {
    await resetAppStores();
  });

  it('shows the local habits feature toggle in experimental settings', () => {
    const onLocalHabitsEnabledChange = vi.fn();
    renderWithProviders(<TestSection onLocalHabitsEnabledChange={onLocalHabitsEnabledChange} />);

    expect(screen.getByRole('heading', { name: 'Experimental' })).toBeInTheDocument();
    const localHabitsGroup = screen.getByRole('group', { name: 'Local habits' });
    fireEvent.click(within(localHabitsGroup).getByRole('button', { name: 'On' }));

    expect(onLocalHabitsEnabledChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole('group', { name: 'Enable local habits' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Keep device awake' })).not.toBeInTheDocument();
  });
});
