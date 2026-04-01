import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { PowerCard } from '@/app/features/power';
import { EntityCardStoryFrame, noopCardSizeChange } from './entity-card-story-frame';

function PowerCardStory(args: Omit<ComponentProps<typeof PowerCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame>
      <PowerCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Power',
  component: PowerCardStory,
  tags: ['autodocs'],
  args: {
    percentage: 68,
    usage: '2.1 kW',
    cost: '2.47',
    size: 'medium',
    isEditMode: false,
  },
} satisfies Meta<typeof PowerCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Medium: Story = {};

export const Small: Story = {
  args: {
    size: 'small',
  },
};

export const LargeHighUsage: Story = {
  args: {
    size: 'large',
    percentage: 87,
    usage: '4.9 kW',
    cost: '5.92',
  },
};
