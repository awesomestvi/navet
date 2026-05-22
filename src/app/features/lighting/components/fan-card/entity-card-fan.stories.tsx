import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { FanCard } from '@/app/features/lighting';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { EntityCardStoryFrame, noopCardSizeChange } from '@/app/storybook/story-frames';

function FanCardStory(args: Omit<ComponentProps<typeof FanCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame size={args.size ?? 'small'}>
      <FanCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Fan',
  component: FanCardStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium'],
    },
    initialPercentage: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
  },
  args: {
    id: 'fan.ceiling_fan',
    name: 'Ceiling Fan',
    room: 'Bedroom',
    initialState: true,
    initialPercentage: 66,
    size: 'small',
    isEditMode: false,
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof FanCardStory>;

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
    initialPercentage: 100,
  },
};

export const Off: Story = {
  args: {
    initialState: false,
    initialPercentage: 0,
  },
};

export const PresetLimited: Story = {
  args: {
    id: 'fan.preset_only_limited_fan',
    name: 'Preset Only Limited Fan',
    initialPercentage: 33,
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
