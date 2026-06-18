import { Button } from '@navet/app/components/primitives/button';
import { useTheme } from '@navet/app/hooks';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import { SettingsDialogStoryFrame } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { RSSFeedSettingsDialog } from './settings-dialog';
import type { RSSProvider } from './types';

function RSSFeedSettingsDialogStory() {
  const { theme } = useTheme();
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>(['bbc-world']);
  const [articleCount, setArticleCount] = useState(6);
  const [tintColor, setTintColor] = useState<string | undefined>('#06b6d4');
  const [isOpen, setIsOpen] = useState(false);
  const [roomValue, setRoomValue] = useState('living-room');

  const providers: RSSProvider[] = [
    {
      id: 'bbc-world',
      name: 'BBC World',
      type: 'url',
      feedUrl: 'https://feeds.bbci.co.uk/news/rss.xml',
    },
  ];

  return (
    <SettingsDialogStoryFrame parentCardClassName="bg-[linear-gradient(180deg,rgba(6,182,212,0.22),rgba(15,23,42,0.3))]">
      <div className="relative flex items-start justify-center p-6">
        <Button variant="secondary" onClick={() => setIsOpen(true)}>
          Open RSS feed dialog
        </Button>
      </div>
      <RSSFeedSettingsDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="Daily Feed"
        roomValue={roomValue}
        roomLabel={roomValue === 'living-room' ? 'Living Room' : 'Kitchen'}
        roomOptions={[
          { value: 'living-room', label: 'Living Room' },
          { value: 'kitchen', label: 'Kitchen' },
        ]}
        theme={theme}
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
        onRoomChange={setRoomValue}
        tintColor={tintColor}
        onTintColorChange={setTintColor}
      />
    </SettingsDialogStoryFrame>
  );
}

const meta = {
  title: 'Cards/Dialogs/RSS Feed',
  component: RSSFeedSettingsDialogStory,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: {} } },
} satisfies Meta<typeof RSSFeedSettingsDialogStory>;

const richComponentDocsDescription = getStoryDocsDescription(meta.title);

meta.parameters = {
  ...meta.parameters,
  docs: {
    ...meta.parameters?.docs,
    description: {
      ...meta.parameters?.docs?.description,
      component: richComponentDocsDescription,
    },
  },
};
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
