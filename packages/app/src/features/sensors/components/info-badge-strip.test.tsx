import { useThemeStore } from '@navet/app/stores/theme-store';
import { renderWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { screen } from '@testing-library/react';
import { Speaker } from 'lucide-react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InfoBadgeStrip } from './info-badge-strip';

describe('InfoBadgeStrip', () => {
  beforeEach(async () => {
    await resetAppStores();
  });

  it('darkens icon accents for light theme chips', () => {
    useThemeStore.getState().setTheme('light');

    renderWithProviders(
      <InfoBadgeStrip
        items={[
          {
            id: 'media',
            title: 'Speakers & TVs',
            value: 'None Playing',
            icon: Speaker,
            iconColor: '#cbd5e1',
            targetSection: 'media',
          },
        ]}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Open Speakers & TVs')).toBeInTheDocument();
    expect(screen.getByTestId('info-badge-strip-icon-media')).toHaveStyle({
      color: 'rgb(135, 145, 157)',
    });
  });
});
