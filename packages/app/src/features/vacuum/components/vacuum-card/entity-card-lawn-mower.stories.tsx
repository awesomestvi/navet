import { LawnMowerCard } from '@navet/app/features/vacuum';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import { EntityCardStoryFrame, noopCardSizeChange } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';

function LawnMowerCardStory(args: Omit<ComponentProps<typeof LawnMowerCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame size={args.size ?? 'small'}>
      <LawnMowerCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const baseLawnMowerArgs: Omit<ComponentProps<typeof LawnMowerCard>, 'onSizeChange'> = {
  id: 'lawn_mower.backyard',
  name: 'Backyard Mower',
  room: 'Garden',
  status: 'docked',
  battery: undefined,
  cleanedArea: undefined,
  cleaningTime: undefined,
  size: 'small',
  isEditMode: false,
};

const meta = {
  title: 'Cards/Entity/Lawn Mower',
  component: LawnMowerCardStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
    status: {
      control: 'select',
      options: ['cleaning', 'returning', 'docked', 'paused', 'idle', 'error'],
    },
  },
  args: baseLawnMowerArgs,
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof LawnMowerCardStory>;

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

export const Docked: Story = {};

export const Mowing: Story = {
  args: {
    status: 'cleaning',
    battery: 84,
    size: 'medium',
  },
};

export const Returning: Story = {
  args: {
    status: 'returning',
    battery: 41,
    size: 'medium',
  },
};

export const Paused: Story = {
  args: {
    status: 'paused',
    battery: 58,
    size: 'small',
  },
};

export const ErrorState: Story = {
  args: {
    status: 'error',
    battery: 27,
    size: 'small',
  },
};

export const Unavailable: Story = {
  args: {
    availability: 'unavailable',
    status: 'idle',
    size: 'small',
  },
};
