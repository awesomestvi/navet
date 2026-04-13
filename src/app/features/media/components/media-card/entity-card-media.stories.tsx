import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { expect, within } from 'storybook/test';
import { MediaCard } from '@/app/features/media';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import nevermindAlbumArt from '@/assets/nevermind-album-art.jpg';
import {
  EntityCardStoryFrame,
  noopCardSizeChange,
} from '../../../dashboard/stories/entity-card-story-frame';

function MediaCardStory(args: Omit<ComponentProps<typeof MediaCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame size={args.size ?? 'medium'}>
      <MediaCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Media',
  component: MediaCardStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'medium-vertical', 'large'],
    },
  },
  args: {
    id: 'media_player.living_room_speaker',
    name: 'Living Room Speaker',
    room: 'Living Room',
    title: 'Smells Like Teen Spirit',
    artist: 'Nirvana',
    entityType: 'Speaker',
    entityPicture: nevermindAlbumArt,
    state: 'playing',
    volume: 42,
    isMuted: false,
    elapsedSeconds: 86,
    durationSeconds: 243,
    positionUpdatedAt: new Date().toISOString(),
    supportsGrouping: true,
    groupMembers: ['Kitchen Speaker'],
    size: 'medium',
    isEditMode: false,
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof MediaCardStory>;

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

export const Speaker: Story = {
  args: {
    size: 'medium',
  },
};

export const SpeakerDialog: Story = {
  args: {
    size: 'medium',
  },
  play: async ({ canvas, userEvent, step }) => {
    await step('opens the media details dialog', async () => {
      await userEvent.click(canvas.getByRole('button', { name: /open media details/i }));
      // Dialog is lazy-loaded inside Suspense; wait for chunk + Radix portal mount.
      const dialog = await within(document.body).findByRole('dialog');
      await expect(dialog).toBeInTheDocument();
      const inDialog = within(dialog);
      await expect(
        inDialog.getByRole('heading', { name: /smells like teen spirit/i })
      ).toBeInTheDocument();
      await expect(inDialog.getByText(/nirvana/i)).toBeInTheDocument();
    });
  },
};

export const SpeakerCompact: Story = {
  args: {
    size: 'small',
  },
};

export const SpeakerMediumVertical: Story = {
  args: {
    size: 'medium-vertical',
  },
};

export const SpeakerLarge: Story = {
  args: {
    size: 'large',
  },
};

const tvCardStoryArgs = {
  id: 'media_player.living_room_tv',
  name: 'Living Room TV',
  room: 'Living Room',
  title: 'Samsung TV Plus',
  artist: 'Live',
  entityType: 'TV',
  deviceClass: 'tv',
  source: 'Samsung TV Plus',
  sourceList: ['TV', 'HDMI 1', 'HDMI 2', 'Apple TV'],
  entityPicture: undefined,
  state: 'idle' as const,
  volume: 18,
  isMuted: false,
  elapsedSeconds: undefined,
  durationSeconds: undefined,
  positionUpdatedAt: undefined,
  supportsGrouping: false,
  groupMembers: [] as string[],
  /** Storybook has no HA `remote.*` entity; enable TV D-pad / channel styling as in a live dashboard */
  simulateTvRemote: true,
} satisfies Partial<Omit<ComponentProps<typeof MediaCard>, 'onSizeChange' | 'isEditMode'>>;

/** Widescreen TV: D-pad overlays top-right; volume/channel + action row share the fixed 104×104 pad size. */
export const TV: Story = {
  args: {
    ...tvCardStoryArgs,
    size: 'medium',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Medium horizontal TV card. The D-pad uses the same 104×104 footprint as every other TV size and sits in the top-right overlay so the bottom action row and volume/channel strip stay clear.',
      },
    },
  },
};

/** Small TV: header gamepad toggles the D-pad; settings stays bottom-right while the pad is open. */
export const TVSmall: Story = {
  args: {
    ...tvCardStoryArgs,
    size: 'small',
    source: 'Source',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Small tile: tap “Show navigation pad” in the header to reveal the same 104×104 D-pad (left-aligned). Volume and channel rows hide until you close the pad; the settings control remains at the bottom right.',
      },
    },
  },
  play: async ({ canvas, userEvent, step }) => {
    await step('toggle navigation pad', async () => {
      await userEvent.click(canvas.getByRole('button', { name: /show navigation pad/i }));
      await expect(canvas.getByRole('button', { name: /^select$/i })).toBeInTheDocument();
      await userEvent.click(canvas.getByRole('button', { name: /hide navigation pad/i }));
    });
  },
};

/** Tall TV: D-pad in document flow under the header (left), then volume/channel and actions. */
export const TVMediumVertical: Story = {
  args: {
    ...tvCardStoryArgs,
    size: 'medium-vertical',
    source: 'Source',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Medium vertical: the D-pad is not absolutely positioned—it sits below the header, left-aligned, with the same 104×104 size as other breakpoints.',
      },
    },
  },
};

/** Large TV: same inline D-pad placement and footprint as vertical medium. */
export const TVLarge: Story = {
  args: {
    ...tvCardStoryArgs,
    size: 'large',
    source: 'Source',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Large tile: D-pad remains the compact 104×104 control under the header; utilities and the action row sit at the bottom of the card.',
      },
    },
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
