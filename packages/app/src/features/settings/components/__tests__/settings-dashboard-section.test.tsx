import { useSettingsSectionController } from '@navet/app/features/settings/hooks/use-settings-section-controller';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { renderWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { SettingsDashboardSection } from '../settings-dashboard-section';

function TestSection() {
  const controller = useSettingsSectionController();
  return (
    <>
      <SettingsDashboardSection controller={controller} />
      {controller.pendingScopedSettingsChange ? (
        <button type="button" onClick={() => controller.confirmScopedSettingsChange('all')}>
          All devices
        </button>
      ) : null}
    </>
  );
}

describe('SettingsDashboardSection', () => {
  beforeEach(async () => {
    await resetAppStores();
  });

  it('renders dashboard controls without the keep-awake experimental toggle', () => {
    renderWithProviders(<TestSection />);

    const kioskModeGroup = screen.getByRole('group', { name: 'Kiosk mode' });
    fireEvent.click(within(kioskModeGroup).getByRole('button', { name: 'On' }));
    fireEvent.click(screen.getByRole('button', { name: 'All devices' }));

    expect(screen.queryByRole('group', { name: 'Keep device awake' })).not.toBeInTheDocument();
  });

  it('switches header title mode and shows the custom text input only for custom mode', () => {
    renderWithProviders(<TestSection />);

    expect(screen.queryByPlaceholderText('Welcome home')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Custom text' }));
    fireEvent.click(screen.getByRole('button', { name: 'All devices' }));

    const input = screen.getByPlaceholderText('Welcome home');
    expect(input).toBeInTheDocument();
    expect(useSettingsStore.getState().headerTitleMode).toBe('custom_text');

    fireEvent.change(input, { target: { value: 'Dinner soon' } });

    expect(useSettingsStore.getState().headerCustomText).toBe('Dinner soon');

    fireEvent.click(screen.getByRole('button', { name: 'Date & Time' }));
    fireEvent.click(screen.getByRole('button', { name: 'All devices' }));

    expect(useSettingsStore.getState().headerTitleMode).toBe('clock');
    expect(screen.queryByPlaceholderText('Welcome home')).not.toBeInTheDocument();
  });

  it('does not render space usage controls in dashboard settings', () => {
    renderWithProviders(<TestSection />);

    expect(screen.queryByText('Space usage')).not.toBeInTheDocument();
  });
});
