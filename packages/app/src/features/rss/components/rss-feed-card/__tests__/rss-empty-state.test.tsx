import { renderWithProviders } from '@navet/app/test/render';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RSSEmptyState } from '../rss-empty-state';
import { getRSSFeedCardSurfaceTokens } from '../surface-tokens';

describe('RSSEmptyState', () => {
  it('shows the shared empty state and opens provider settings', () => {
    const onOpenSettings = vi.fn();

    renderWithProviders(
      <RSSEmptyState
        hasConfiguredProviders={false}
        hasSelectedProviders={false}
        error={null}
        inEditMode={false}
        size="medium"
        rssSurface={getRSSFeedCardSurfaceTokens('glass', '#f97316')}
        onOpenSettings={onOpenSettings}
      />
    );

    expect(screen.getByText('No RSS providers')).toBeInTheDocument();
    expect(screen.getByText('Add RSS providers to start following feeds.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Configure RSS providers' }));

    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});
