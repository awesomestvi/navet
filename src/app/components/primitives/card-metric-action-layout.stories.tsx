import type { Meta, StoryObj } from '@storybook/react';
import { CardMetric } from './card-metric';
import { CardMetricActionLayout } from './card-metric-action-layout';

const meta = {
  title: 'Components/Primitives/Cards/Card Metric Action Layout',
  component: CardMetricActionLayout,
  tags: ['autodocs'],
  args: {
    size: 'medium',
    metric: (
      <CardMetric
        value="68%"
        label="blinds open"
        size="sm"
        isActive
        accentClassName="text-emerald-300"
        theme="glass"
      />
    ),
    actions: (
      <div className="flex gap-2">
        <button type="button" className="rounded-lg bg-white/15 px-3 py-1.5 text-xs text-white">
          Open
        </button>
        <button type="button" className="rounded-lg bg-white/15 px-3 py-1.5 text-xs text-white">
          Close
        </button>
      </div>
    ),
  },
} satisfies Meta<typeof CardMetricActionLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="h-56 w-64 rounded-2xl bg-slate-900 p-4 text-white">
      <CardMetricActionLayout {...args} />
    </div>
  ),
};

export const LargeSpacing: Story = {
  args: {
    size: 'large',
  },
  render: (args) => (
    <div className="h-64 w-64 rounded-2xl bg-slate-900 p-4 text-white">
      <CardMetricActionLayout {...args} />
    </div>
  ),
};
