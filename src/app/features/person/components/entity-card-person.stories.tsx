import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { PersonCard } from '@/app/features/person';
import {
  EntityCardStoryFrame,
  noopCardSizeChange,
} from '../../dashboard/stories/entity-card-story-frame';

function PersonCardStory(args: Omit<ComponentProps<typeof PersonCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame>
      <PersonCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Person',
  component: PersonCardStory,
  tags: ['autodocs'],
  args: {
    id: 'person.alex',
    name: 'Alex',
    room: 'Home',
    location: 'Office',
    state: 'home',
    size: 'medium',
    isEditMode: false,
  },
} satisfies Meta<typeof PersonCardStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Home: Story = {};

export const Away: Story = {
  args: {
    state: 'away',
    location: 'Airport',
  },
};

export const SmallHome: Story = {
  args: {
    size: 'small',
  },
};
