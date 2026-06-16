import { useSettingsSectionController } from '@navet/app/features/settings/hooks/use-settings-section-controller';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { renderWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { SettingsAppearanceSection } from '../settings-appearance-section';

function TestSection() {
  const controller = useSettingsSectionController();
  return <SettingsAppearanceSection controller={controller} />;
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
    expect(useSettingsStore.getState().dashboardSpaceMode).toBe('more_space');
    expect(
      screen.getByText('Denser layout. Some touch controls may be harder to use.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Default' }));
    expect(useSettingsStore.getState().dashboardSpaceMode).toBe('default');
    expect(
      screen.queryByText('Denser layout. Some touch controls may be harder to use.')
    ).not.toBeInTheDocument();
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
