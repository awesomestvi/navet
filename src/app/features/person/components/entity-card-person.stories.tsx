import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { PersonCard } from '@/app/features/person';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { EntityCardStoryFrame, noopCardSizeChange } from '@/app/storybook/story-frames';

function PersonCardStory(args: Omit<ComponentProps<typeof PersonCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame size={args.size ?? 'small'}>
      <PersonCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Person',
  component: PersonCardStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['tiny', 'extra-small', 'small'],
    },
  },
  args: {
    id: 'person.alex',
    name: 'Alex',
    room: 'Home',
    location: 'Office',
    state: 'home',
    size: 'small',
    isEditMode: false,
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof PersonCardStory>;

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

export const Tiny: Story = {
  args: {
    size: 'tiny',
  },
};

export const ExtraSmall: Story = {
  args: {
    size: 'extra-small',
  },
};

export const Small: Story = {
  args: {
    size: 'small',
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
