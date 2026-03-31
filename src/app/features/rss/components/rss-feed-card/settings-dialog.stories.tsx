import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { RSSFeedSettingsDialog } from './settings-dialog';
import type { RSSProvider } from './types';

function RSSFeedSettingsDialogStory() {
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>(['ha-news']);
  const [articleCount, setArticleCount] = useState(6);
  const [tintColor, setTintColor] = useState<string | undefined>('#06b6d4');

  const providers: RSSProvider[] = [
    {
      id: 'ha-news',
      name: 'Home Assistant Blog',
      type: 'home-assistant-feedreader',
      entityId: 'feedreader.home_assistant_blog',
    },
    {
      id: 'tech-feed',
      name: 'Tech Feed',
      type: 'url',
      feedUrl: 'https://example.com/rss.xml',
    },
  ];

  return (
    <RSSFeedSettingsDialog
      isOpen
      onOpenChange={() => {}}
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
      homeAssistantProviders={providers.filter(
        (provider) => provider.type === 'home-assistant-feedreader'
      )}
      selectedProviderIds={selectedProviderIds}
      onSelectedProviderIdsChange={setSelectedProviderIds}
      onAddProvider={() => true}
      onRemoveProvider={() => {}}
      articleCount={articleCount}
      onArticleCountChange={setArticleCount}
      onRoomChange={() => {}}
      tintColor={tintColor}
      onTintColorChange={setTintColor}
    />
  );
}

const meta = {
  title: 'Settings Dialogs/RSS Feed',
  component: RSSFeedSettingsDialogStory,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof RSSFeedSettingsDialogStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
