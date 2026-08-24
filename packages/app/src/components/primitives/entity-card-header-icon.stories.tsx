import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import type { Meta, StoryObj } from '@storybook/react';
import { Lightbulb, Settings2 } from 'lucide-react';
import { EntityCardHeaderIcon } from './entity-card-header-icon';

const meta = {
  title: 'Components/Primitives/Cards/Entity/Header Icon',
  component: EntityCardHeaderIcon,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Theme-aware icon badge used in entity card headers. Its shared control frame is 32 px for precise pointers and 36 px on touch-capable devices, while preserving icon glyphs, text fallback, active styling, and optional interaction.',
      },
    },
  },
  args: {
    IconComponent: Lightbulb,
    isActive: true,
    size: 'medium',
    ariaLabel: 'Toggle light',
  },
  argTypes: {
    onClick: { action: 'clicked' },
  },
} satisfies Meta<typeof EntityCardHeaderIcon>;

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

export const IconOnly: Story = {};

export const Interactive: Story = {
  args: {
    onClick: () => undefined,
  },
};

export const TextFallback: Story = {
  args: {
    IconComponent: undefined,
    iconText: 'LR',
    isActive: false,
    size: 'small',
  },
};

export const DenseSensor: Story = {
  args: {
    size: 'extra-small',
    variant: 'dense',
  },
};

export const LargeSoftTone: Story = {
  args: {
    IconComponent: Settings2,
    size: 'large',
    tone: 'primary',
    isActive: false,
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
