import type { Meta, StoryObj } from '@storybook/react';
import { Lightbulb, Settings2 } from 'lucide-react';
import { EntityCardHeaderIcon } from './entity-card-header-icon';

const meta = {
  title: 'Components/Primitives/Entity Card Header Icon',
  component: EntityCardHeaderIcon,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Theme-aware icon badge used in entity card headers. Supports icon glyphs, text fallback, active state styling, and optional interactive click mode.',
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

export const LargeSoftTone: Story = {
  args: {
    IconComponent: Settings2,
    size: 'large',
    tone: 'primary',
    isActive: false,
  },
};
