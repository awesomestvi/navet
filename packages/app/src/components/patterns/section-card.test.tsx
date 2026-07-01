import { useSettingsStore } from '@navet/app/stores';
import { renderWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { SectionCard } from './section-card';

describe('SectionCard', () => {
  beforeEach(async () => {
    await resetAppStores();
  });

  it('renders the eyebrow outside kiosk mode', () => {
    renderWithProviders(
      <SectionCard title="Energy" eyebrow="Overview">
        <div>Body</div>
      </SectionCard>
    );

    expect(screen.getByText('Overview')).toBeInTheDocument();
  });

  it('hides the eyebrow in kiosk mode', () => {
    useSettingsStore.getState().updateSettings({ kioskMode: true });

    renderWithProviders(
      <SectionCard title="Energy" eyebrow="Overview">
        <div>Body</div>
      </SectionCard>
    );

    expect(screen.queryByText('Overview')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Energy' })).toBeInTheDocument();
  });
});
