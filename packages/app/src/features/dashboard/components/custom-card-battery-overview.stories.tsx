import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import { buildCustomCard, CustomWidgetStoryFrame } from '@navet/app/storybook/story-frames';
import type { Meta, StoryObj } from '@storybook/react';

type BatteryOverviewStoryArgs = {
  size: CardSize;
};

function BatteryOverviewStoryFrame({ size }: BatteryOverviewStoryArgs) {
  return <CustomWidgetStoryFrame card={buildCustomCard('battery', size)} />;
}

const meta = {
  title: 'Cards/Custom/Battery Overview',
  component: BatteryOverviewStoryFrame,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<BatteryOverviewStoryArgs>;

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

type Story = StoryObj<BatteryOverviewStoryArgs>;

export const Playground: Story = {
  args: {
    size: 'large',
  },
};

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

export const Large: Story = {
  args: {
    size: 'large',
  },
};
