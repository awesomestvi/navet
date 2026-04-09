import type { Meta, StoryObj } from '@storybook/react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { RoomEyebrow } from './room-eyebrow';

const meta = {
  title: 'Components/Primitives/Room Eyebrow',
  component: RoomEyebrow,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Compact room label used in dialog headers. Supports interactive (button) and visual-only (aria-hidden div) modes. Use visualOnly with an overlaid native select for accessible room assignment.',
      },
    },
  },
  argTypes: {
    room: { control: 'text' },
    forceDark: { control: 'boolean' },
    isLoading: { control: 'boolean' },
    visualOnly: { control: 'boolean' },
    focused: { control: 'boolean' },
  },
} satisfies Meta<typeof RoomEyebrow>;

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

export const Default: Story = {
  args: {
    room: 'Living Room',
  },
};

export const ForceDark: Story = {
  args: { room: 'Living Room' },
  render: () => (
    <div className="w-72 rounded-3xl bg-linear-to-br from-orange-900/95 to-orange-950/95 p-6">
      <RoomEyebrow room="Living Room" forceDark />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Force-dark text for components inside always-dark colored dialog backgrounds.',
      },
    },
  },
};

export const Loading: Story = {
  args: {
    room: 'Kitchen',
    isLoading: true,
  },
};

export const VisualOnly: Story = {
  args: {
    room: 'Bedroom',
    visualOnly: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Renders as aria-hidden div with pointer-events-none. Used when a transparent native select overlay handles interaction.',
      },
    },
  },
};
