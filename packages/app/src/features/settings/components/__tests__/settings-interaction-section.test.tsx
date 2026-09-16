import { useSettingsSectionController } from '@navet/app/features/settings/hooks/use-settings-section-controller';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { renderWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsInteractionSection } from '../settings-interaction-section';

vi.mock('@navet/app/runtime/app-mode', () => ({
  isHomeAssistantPanelMode: () => false,
}));

function TestSection() {
  const controller = useSettingsSectionController();
  return <SettingsInteractionSection controller={controller} />;
}

describe('SettingsInteractionSection', () => {
  beforeEach(async () => {
    await resetAppStores();
  });

  it('keeps browser zoom available until the user opts in', () => {
    renderWithProviders(<TestSection />);

    const allowZoom = screen.getByRole('button', { name: 'Allow zoom' });
    const limitZoom = screen.getByRole('button', { name: 'Limit zoom' });
    expect(allowZoom).toHaveAttribute('aria-pressed', 'true');
    expect(limitZoom).toHaveAttribute('aria-pressed', 'false');
    expect(useSettingsStore.getState().preventBrowserZoom).toBe(false);

    fireEvent.click(limitZoom);
    expect(limitZoom).toHaveAttribute('aria-pressed', 'true');
    expect(useSettingsStore.getState().preventBrowserZoom).toBe(true);

    fireEvent.click(allowZoom);
    expect(allowZoom).toHaveAttribute('aria-pressed', 'true');
    expect(useSettingsStore.getState().preventBrowserZoom).toBe(false);
  });
});
