import { CoverCard } from '@navet/app/features/security';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import { EntityCardStoryFrame, noopCardSizeChange } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';

function CoverCardStory(args: Omit<ComponentProps<typeof CoverCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame size={args.size ?? 'medium'}>
      <CoverCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Cover',
  component: CoverCardStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
  },
  args: {
    id: 'cover.living_room_blind',
    name: 'Living Room Blind',
    room: 'Living Room',
    initialPosition: 72,
    hasPosition: true,
    supportedFeatures: 15,
    initialDeviceClass: 'blind',
    size: 'medium',
    isEditMode: false,
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof CoverCardStory>;

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

export const Playground: Story = {};

export const Small: Story = {
  args: {
    size: 'small',
  },
};

export const Medium: Story = {
  args: {
    size: 'medium',
  },
};

export const LargeSwipe: Story = {
  args: {
    size: 'large',
    initialPosition: 50,
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
