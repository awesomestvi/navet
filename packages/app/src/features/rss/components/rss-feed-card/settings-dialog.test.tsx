import { renderWithProviders } from '@navet/app/test/render';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RSSFeedSettingsDialog } from './settings-dialog';
import type { RSSProvider } from './types';

const providers: RSSProvider[] = [
  {
    id: 'bbc-world',
    name: 'BBC World',
    type: 'url',
    feedUrl: 'https://feeds.bbci.co.uk/news/world/rss.xml',
  },
];

describe('RSSFeedSettingsDialog', () => {
  it('renders the updated header layout with room selector on the right', () => {
    renderWithProviders(
      <RSSFeedSettingsDialog
        isOpen
        onOpenChange={vi.fn()}
        title="Daily Feed"
        roomValue="living-room"
        roomLabel="Living Room"
        roomOptions={[
          { value: 'living-room', label: 'Living Room' },
          { value: 'kitchen', label: 'Kitchen' },
        ]}
        theme="glass"
        primaryColorValue="#06b6d4"
        providers={providers}
        selectedProviderIds={['bbc-world']}
        onSelectedProviderIdsChange={vi.fn()}
        onAddProvider={() => true}
        onRemoveProvider={vi.fn()}
        articleCount={6}
        onArticleCountChange={vi.fn()}
        onRoomChange={vi.fn()}
        tintColor="#06b6d4"
        onTintColorChange={vi.fn()}
      />
    );

    expect(screen.getAllByText('Daily Feed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Living Room').length).toBeGreaterThan(0);
  });
});
