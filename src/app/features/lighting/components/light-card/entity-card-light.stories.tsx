import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { LightCard } from '@/app/features/lighting';
import {
  EntityCardStoryFrame,
  noopCardSizeChange,
} from '../../../dashboard/stories/entity-card-story-frame';

function LightCardStory(args: Omit<ComponentProps<typeof LightCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame size={args.size ?? 'medium'}>
      <LightCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Light',
  component: LightCardStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['extra-small', 'small', 'medium', 'large'],
    },
  },
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

export const Playground: Story = {};
