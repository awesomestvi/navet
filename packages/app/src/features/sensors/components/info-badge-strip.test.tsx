import { useThemeStore } from '@navet/app/stores/theme-store';
import { renderWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { screen } from '@testing-library/react';
import { Shield, Speaker } from 'lucide-react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SummaryBar } from './info-badge-strip';

describe('SummaryBar', () => {
  beforeEach(async () => {
    await resetAppStores();
  });

  it('darkens icon accents for light theme chips', () => {
    useThemeStore.getState().setTheme('light');

    renderWithProviders(
      <SummaryBar
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

  it('renders danger summaries as tinted red pills with an expanding icon halo', () => {
    renderWithProviders(
      <SummaryBar
        items={[
          {
            id: 'security',
            title: 'Security',
            value: '2 Alerts',
            icon: Shield,
            iconColor: '#f87171',
            tone: 'danger',
            targetSection: 'security',
          },
        ]}
        onNavigate={vi.fn()}
      />
    );

    const pill = screen.getByRole('button', { name: 'Open Security' });
    expect(pill).toHaveClass('border-red-500/30', 'bg-red-500/10', 'text-red-100');
    expect(screen.getByText('2 Alerts')).toHaveClass('text-red-200/80');
    expect(screen.getByTestId('info-badge-strip-icon-security')).toHaveClass(
      'relative',
      'border-red-400/45',
      'bg-red-500/22'
    );
    expect(screen.getByTestId('info-badge-strip-icon-security')).not.toHaveClass(
      'motion-safe:animate-pulse'
    );
    expect(screen.getByTestId('info-badge-strip-icon-pulse-security')).toHaveClass(
      'motion-safe:animate-ping',
      'motion-reduce:hidden'
    );
    expect(screen.queryByTestId('info-badge-strip-pulse-security')).not.toBeInTheDocument();
  });

  it('keeps the summary lane available for trailing controls without summary items', () => {
    renderWithProviders(
      <SummaryBar
        items={[]}
        ariaLabel="Energy"
        trailingContent={<button type="button">Week</button>}
      />
    );

    expect(screen.getByRole('navigation', { name: 'Energy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Week' })).toBeInTheDocument();
  });
});
