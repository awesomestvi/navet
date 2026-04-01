import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { LightCard } from '@/app/features/lighting';
import { EntityCardStoryFrame, noopCardSizeChange } from './entity-card-story-frame';

function LightCardStory(args: Omit<ComponentProps<typeof LightCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame>
      <LightCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Light',
  component: LightCardStory,
  tags: ['autodocs'],
  args: {
    id: 'light.living_room',
    name: 'Living Room',
    room: 'Living Room',
    initialState: true,
    initialBrightness: 64,
    initialTemp: 3900,
    size: 'medium',
    isEditMode: false,
  },
} satisfies Meta<typeof LightCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MediumOn: Story = {};

export const SmallOff: Story = {
  args: {
    size: 'small',
    initialState: false,
    initialBrightness: 0,
  },
};

export const LargeWarm: Story = {
  args: {
    size: 'large',
    initialState: true,
    initialBrightness: 90,
    initialTemp: 2700,
  },
};
