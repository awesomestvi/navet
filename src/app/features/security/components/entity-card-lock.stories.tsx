import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { LockCard } from '@/app/features/security';
import { EntityCardStoryFrame } from '../../dashboard/stories/entity-card-story-frame';

function LockCardStory(args: ComponentProps<typeof LockCard>) {
  return (
    <EntityCardStoryFrame size={args.size ?? 'small'}>
      <LockCard {...args} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Lock',
  component: LockCardStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['tiny', 'extra-small', 'small'],
    },
  },
  args: {
    id: 'lock.front_door',
    name: 'Front Door',
    initialState: true,
    size: 'small',
    isEditMode: false,
  },
} satisfies Meta<typeof LockCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
