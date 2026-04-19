import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Button } from '@/app/components/primitives/button';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { SettingsDialogStoryFrame } from '@/app/storybook/story-frames';
import { PhotoFrameSettingsDialog } from './photo-frame-settings-dialog';
import type { PhotoFrameSourceMode } from './photo-frame-types';

function PhotoFrameSettingsDialogStory() {
  const [isOpen, setIsOpen] = useState(false);
  const [roomValue, setRoomValue] = useState('__home__');
  const [sourceMode, setSourceMode] = useState<PhotoFrameSourceMode>('urls');
  const [photoUrls, setPhotoUrls] = useState([
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1280&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1494526585095-c41746248156?w=1280&q=80&auto=format&fit=crop',
  ]);
  const [mediaSourceId, setMediaSourceId] = useState('media-source://media_source/local/photos');
  const [shuffleEnabled, setShuffleEnabled] = useState(true);
  const [tintColor, setTintColor] = useState<string | undefined>('#f97316');

  return (
    <SettingsDialogStoryFrame parentCardClassName="bg-[linear-gradient(180deg,rgba(249,115,22,0.18),rgba(15,23,42,0.28))]">
      <div className="relative flex items-start justify-center p-6">
        <Button variant="secondary" onClick={() => setIsOpen(true)}>
          Open photo dialog
        </Button>
      </div>
      <PhotoFrameSettingsDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        roomValue={roomValue}
        roomLabel={roomValue === '__home__' ? 'Home' : roomValue}
        roomOptions={[
          { label: 'Home', value: '__home__' },
          { label: 'Bedroom', value: 'Bedroom' },
          { label: 'Living Room', value: 'Living Room' },
        ]}
        onRoomChange={setRoomValue}
        sourceMode={sourceMode}
        onSourceModeChange={setSourceMode}
        photoUrls={photoUrls}
        onUpdateUrls={setPhotoUrls}
        mediaSourceId={mediaSourceId}
        onMediaSourceIdChange={setMediaSourceId}
        shuffleEnabled={shuffleEnabled}
        onShuffleEnabledChange={setShuffleEnabled}
        tintColor={tintColor}
        onTintColorChange={setTintColor}
      />
    </SettingsDialogStoryFrame>
  );
}

const meta = {
  title: 'Cards/Dialogs/Photo',
  component: PhotoFrameSettingsDialogStory,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: {} } },
} satisfies Meta<typeof PhotoFrameSettingsDialogStory>;

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
