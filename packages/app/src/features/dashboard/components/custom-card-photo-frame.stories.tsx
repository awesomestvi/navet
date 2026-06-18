import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { getCardSizeOverlayStyle } from '@navet/app/components/shared/card-size-selector';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import type { Meta, StoryObj } from '@storybook/react';
import type { PhotoFrameImage } from './widgets/photo-frame-image';
import { PhotoFrameWidget } from './widgets/photo-frame-widget';

type PhotoStoryArgs = {
  size: CardSize;
  shuffleEnabled: boolean;
};

function createStoryPhotoFrameImage(name: string): PhotoFrameImage {
  return {
    src: new URL(`../../../../../../assets/reference/photo-frame/${name}.webp`, import.meta.url)
      .href,
    sources: [
      {
        srcSet: new URL(
          `../../../../../../assets/reference/photo-frame/${name}.avif`,
          import.meta.url
        ).href,
        type: 'image/avif',
      },
      {
        srcSet: new URL(
          `../../../../../../assets/reference/photo-frame/${name}.webp`,
          import.meta.url
        ).href,
        type: 'image/webp',
      },
    ],
  };
}

const STORY_PHOTO_FRAME_IMAGES: readonly PhotoFrameImage[] = [
  createStoryPhotoFrameImage('country-walk'),
  createStoryPhotoFrameImage('night-out'),
  createStoryPhotoFrameImage('desert-friends'),
  createStoryPhotoFrameImage('city-cafe'),
  createStoryPhotoFrameImage('beach-friends'),
];

function PhotoStoryPreview({ size, shuffleEnabled }: PhotoStoryArgs) {
  return (
    <div style={getCardSizeOverlayStyle(size)}>
      <PhotoFrameWidget
        size={size}
        photoImages={STORY_PHOTO_FRAME_IMAGES}
        shuffleEnabled={shuffleEnabled}
      />
    </div>
  );
}

function PhotoEmptyStatePreview({ size }: Pick<PhotoStoryArgs, 'size'>) {
  return (
    <div style={getCardSizeOverlayStyle(size)}>
      <PhotoFrameWidget
        size={size}
        sourceMode="urls"
        photoUrls={[]}
        photoImages={[]}
        shuffleEnabled={false}
        onUpdateUrls={() => undefined}
        onSourceModeChange={() => undefined}
        onMediaSourceIdChange={() => undefined}
      />
    </div>
  );
}

const meta = {
  title: 'Cards/Custom/Photo',
  component: PhotoStoryPreview,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium', 'large', 'extra-large'],
    },
    shuffleEnabled: {
      control: 'boolean',
    },
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<PhotoStoryArgs>;

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

type Story = StoryObj<PhotoStoryArgs>;

export const Playground: Story = {
  args: {
    size: 'large',
    shuffleEnabled: true,
  },
};

export const Small: Story = {
  args: {
    size: 'small',
    shuffleEnabled: true,
  },
};

export const Medium: Story = {
  args: {
    size: 'medium',
    shuffleEnabled: true,
  },
};

export const Large: Story = {
  args: {
    size: 'large',
    shuffleEnabled: true,
  },
};

export const ExtraLarge: Story = {
  args: {
    size: 'extra-large',
    shuffleEnabled: true,
  },
};

export const EmptyState: Story = {
  render: (args) => <PhotoEmptyStatePreview size={args.size} />,
  args: {
    size: 'large',
    shuffleEnabled: false,
  },
};
