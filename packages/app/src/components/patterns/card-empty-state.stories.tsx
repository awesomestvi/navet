import { BaseCard } from '@navet/app/components/primitives';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Gauge, Plus, Rss } from 'lucide-react';
import { expect, fn, userEvent } from 'storybook/test';
import { CardEmptyState } from './card-empty-state';

const meta = {
  title: 'Components/Patterns/Card Empty State',
  component: CardEmptyState,
  decorators: [
    (Story, { args }) => {
      const size = args.size ?? 'medium';
      return (
        <div style={{ width: size === 'small' ? 160 : 320, height: size === 'large' ? 320 : 160 }}>
          <BaseCard size={size}>
            <Story />
          </BaseCard>
        </div>
      );
    },
  ],
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
    onAction: { control: false },
    icon: { control: false },
    actionIcon: { control: false },
  },
  args: {
    title: 'No feeds selected',
    description: 'Select one or more providers for this card.',
    icon: Rss,
    actionLabel: 'Configure RSS providers',
    actionIcon: Plus,
    onAction: fn(),
    size: 'medium',
    accentColor: '#3b82f6',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Compact card-level empty state with an icon tile, short copy, and optional action.',
      },
    },
  },
} satisfies Meta<typeof CardEmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ canvas, args }) => {
    const action = canvas.getByRole('button', { name: 'Configure RSS providers' });
    await userEvent.click(action);
    await expect(args.onAction).toHaveBeenCalledTimes(1);
    await expect(action).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onAction).toHaveBeenCalledTimes(2);
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

export const LargeNoAction: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'No feeds selected' })).toBeVisible();
    await expect(canvas.queryByRole('button')).not.toBeInTheDocument();
  },
  args: {
    size: 'large',
    actionLabel: undefined,
    onAction: undefined,
  },
};

export const SensorGroup: Story = {
  render: () => (
    <CardEmptyState
      title="No sensors selected"
      description="Add sensors to this group to track them together."
      icon={Gauge}
      actionLabel="Add Sensors"
      actionIcon={Plus}
      onAction={() => {}}
      size="medium"
      accentColor="#14b8a6"
    />
  ),
};
