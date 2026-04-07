import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { SettingsDialogStoryFrame } from '@/app/features/settings/components/settings-dialog-story-frame';
import { RSSFeedSettingsDialog } from './settings-dialog';
import type { RSSProvider } from './types';

function RSSFeedSettingsDialogStory() {
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>(['bbc-world']);
  const [articleCount, setArticleCount] = useState(6);
  const [tintColor, setTintColor] = useState<string | undefined>('#06b6d4');

  const providers: RSSProvider[] = [
    {
      id: 'bbc-world',
      name: 'BBC World',
      type: 'url',
      feedUrl: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    },
  ];

  return (
    <SettingsDialogStoryFrame parentCardClassName="bg-[linear-gradient(180deg,rgba(6,182,212,0.22),rgba(15,23,42,0.3))]">
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
    </SettingsDialogStoryFrame>
  );
}

const meta = {
  title: 'Settings/Dialogs/RSS Feed',
  component: RSSFeedSettingsDialogStory,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof RSSFeedSettingsDialogStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
