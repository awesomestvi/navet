import { ClimateCard } from '@navet/app/features/climate';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import { EntityCardStoryFrame, noopCardSizeChange } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';

function ClimateCardStory(args: Omit<ComponentProps<typeof ClimateCard>, 'onSizeChange'>) {
  return (
    <EntityCardStoryFrame size={args.size ?? 'medium'}>
      <ClimateCard {...args} onSizeChange={noopCardSizeChange} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Climate',
  component: ClimateCardStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium'],
    },
  },
  args: {
    id: 'climate.main_floor',
    name: 'Main Floor Climate',
    room: 'Hallway',
    initialTemp: 22,
    initialCurrentTemp: 21,
    initialMode: 'cool',
    initialAction: 'cooling',
    initialState: true,
    size: 'medium',
    isEditMode: false,
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof ClimateCardStory>;

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

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
