import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSettingsSectionController } from '@/app/features/settings/hooks/use-settings-section-controller';
import { renderWithProviders } from '@/test/render';
import { resetAppStores } from '@/test/store-reset';
import { SettingsDashboardSection } from '../settings-dashboard-section';

function TestSection() {
  const controller = useSettingsSectionController();
  return <SettingsDashboardSection controller={controller} />;
}

describe('SettingsDashboardSection', () => {
  beforeEach(async () => {
    await resetAppStores();
  });

  it('renders dashboard controls without the keep-awake experimental toggle', () => {
    renderWithProviders(<TestSection />);

    const kioskModeGroup = screen.getByRole('group', { name: 'Kiosk mode' });
    fireEvent.click(within(kioskModeGroup).getByRole('button', { name: 'On' }));

    expect(screen.queryByRole('group', { name: 'Keep device awake' })).not.toBeInTheDocument();
  });
});
