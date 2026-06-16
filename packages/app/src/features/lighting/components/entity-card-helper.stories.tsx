import { SwitchCard } from '@navet/app/features/lighting';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import { EntityCardStoryFrame } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';

function HelperCardStory(args: ComponentProps<typeof SwitchCard>) {
  return (
    <EntityCardStoryFrame size={args.size ?? 'small'}>
      <SwitchCard {...args} />
    </EntityCardStoryFrame>
  );
}

const meta = {
  title: 'Cards/Entity/Helper',
  component: HelperCardStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['tiny', 'small', 'medium'],
    },
  },
  args: {
    id: 'input_boolean.guest_mode',
    name: 'Guest mode',
    initialState: true,
    entityType: 'helper',
    serviceDomain: 'input_boolean',
    serviceAction: 'toggle',
    size: 'small',
    isEditMode: false,
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof HelperCardStory>;

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

export const Medium: Story = {
  args: {
    size: 'medium',
  },
};
