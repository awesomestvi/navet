import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { expect } from 'storybook/test';
import { LightCard } from '@/app/features/lighting';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
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
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof LightCardStory>;

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

export const Playground: Story = {
  play: async ({ canvas, userEvent, step }) => {
    const lightCard = canvas.getByRole('button', { name: /^living room$/i });

    await step('shows the light as on initially', async () => {
      await expect(lightCard).toHaveAttribute('aria-pressed', 'true');
    });

    await step('toggles the light off when the card is clicked', async () => {
      await userEvent.click(lightCard);
      await expect(lightCard).toHaveAttribute('aria-pressed', 'false');
    });

    await step('toggles the light back on when clicked again', async () => {
      await userEvent.click(lightCard);
      await expect(lightCard).toHaveAttribute('aria-pressed', 'true');
    });
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

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
