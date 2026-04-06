import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { PowerCard } from '@/app/features/power';
import {
  EntityCardStoryFrame,
  noopCardSizeChange,
} from '../../dashboard/stories/entity-card-story-frame';

function PowerCardStory(args: Omit<ComponentProps<typeof PowerCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame size={args.size ?? 'medium'}>
      <PowerCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Power',
  component: PowerCardStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['extra-small', 'small', 'medium', 'large'],
    },
  },
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

export const Playground: Story = {};
