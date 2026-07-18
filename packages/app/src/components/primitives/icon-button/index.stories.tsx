import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import type { Meta, StoryObj } from '@storybook/react';
import { BellOff, MoreHorizontal, Settings2 } from 'lucide-react';
import { IconButton } from './index';

const meta = {
  title: 'Components/Primitives/Icon Button',
  component: IconButton,
  tags: ['autodocs'],
  args: {
    label: 'Open settings',
    icon: <Settings2 className="h-4 w-4" aria-hidden="true" />,
    size: 'default',
    variant: 'subtle',
    loading: false,
    disabled: false,
  },
  argTypes: {
    icon: { control: false },
    size: { control: 'select', options: ['compact', 'small', 'default'] },
    variant: { control: 'select', options: ['subtle', 'ghost', 'secondary'] },
  },
  parameters: {
    docs: {
      description: {
        component: getStoryDocsDescription('Components/Primitives/Icon Button'),
      },
    },
  },
} satisfies Meta<typeof IconButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <IconButton
        label="More room actions"
        icon={<MoreHorizontal className="h-4 w-4" aria-hidden="true" />}
        size="compact"
      />
      <IconButton
        label="Mute door alerts"
        icon={<BellOff className="h-4 w-4" aria-hidden="true" />}
        size="small"
      />
      <IconButton
        label="Open room settings"
        icon={<Settings2 className="h-4 w-4" aria-hidden="true" />}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Supported hit-target tiers for dense toolbars, compact card actions, and standard dialog controls.',
      },
    },
  },
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <IconButton
        label="Open settings"
        icon={<Settings2 className="h-4 w-4" aria-hidden="true" />}
        variant="subtle"
      />
      <IconButton
        label="More actions"
        icon={<MoreHorizontal className="h-4 w-4" aria-hidden="true" />}
        variant="ghost"
      />
      <IconButton
        label="Mute alerts"
        icon={<BellOff className="h-4 w-4" aria-hidden="true" />}
        variant="secondary"
      />
    </div>
  ),
};

export const Pending: Story = {
  args: {
    label: 'Saving room settings',
    loading: true,
  },
};

export const Disabled: Story = {
  args: {
    label: 'Settings unavailable',
    disabled: true,
  },
};
