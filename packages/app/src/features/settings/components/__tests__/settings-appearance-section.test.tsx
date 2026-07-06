import { useSettingsSectionController } from '@navet/app/features/settings/hooks/use-settings-section-controller';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { renderWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { SettingsAppearanceSection } from '../settings-appearance-section';

function TestSection() {
  const controller = useSettingsSectionController();
  return (
    <>
      <SettingsAppearanceSection controller={controller} />
      {controller.pendingScopedSettingsChange ? (
        <button type="button" onClick={() => controller.confirmScopedSettingsChange('all')}>
          All devices
        </button>
      ) : null}
    </>
  );
}

describe('SettingsAppearanceSection', () => {
  beforeEach(async () => {
    await resetAppStores();
  });

  it('switches dashboard space mode between default and more space', () => {
    renderWithProviders(<TestSection />);

    expect(
      screen.queryByText('Denser layout. Some touch controls may be harder to use.')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'More space' }));
    fireEvent.click(screen.getByRole('button', { name: 'All devices' }));
    expect(useSettingsStore.getState().dashboardSpaceMode).toBe('more_space');
    expect(
      screen.getByText('Denser layout. Some touch controls may be harder to use.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Default' }));
    fireEvent.click(screen.getByRole('button', { name: 'All devices' }));
    expect(useSettingsStore.getState().dashboardSpaceMode).toBe('default');
    expect(
      screen.queryByText('Denser layout. Some touch controls may be harder to use.')
    ).not.toBeInTheDocument();
  });

  it('confirms visual quality through the scoped settings dialog', () => {
    renderWithProviders(<TestSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Medium' }));

    expect(useSettingsStore.getState().effectsQuality).toBe('high');

    fireEvent.click(screen.getByRole('button', { name: 'All devices' }));

    expect(useSettingsStore.getState().effectsQuality).toBe('medium');
    expect(useSettingsStore.getState().disableAnimations).toBe(false);
    expect(useSettingsStore.getState().lowPowerMode).toBe(false);
  });

  it('disables ambience controls when low-power mode forces effective low quality', () => {
    useSettingsStore.getState().updateSettings({
      effectsQuality: 'high',
      lowPowerMode: true,
      ambientLightBleed: true,
    });

    renderWithProviders(<TestSection />);

    expect(screen.getByRole('button', { name: 'Ambient bleed' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Contained' })).toBeDisabled();
    expect(
      screen.getByText(
        'Available only on High visual quality. Light cards use Contained mode on Medium and Low.'
      )
    ).toBeInTheDocument();
  });
});
