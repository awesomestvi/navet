import type { Meta, StoryObj } from '@storybook/react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { CardMetric } from './card-metric';

const meta = {
  title: 'Components/Primitives/Cards/Card Metric',
  component: CardMetric,
  tags: ['autodocs'],
  args: {
    value: '23°C',
    label: 'cloudy',
    size: 'sm',
    isActive: true,
    accentClassName: 'text-white',
    theme: 'glass',
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof CardMetric>;

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

export const Default: Story = {
  render: (args) => (
    <div className="w-56 rounded-2xl bg-sky-700 p-4">
      <CardMetric {...args} />
    </div>
  ),
};

export const Inactive: Story = {
  args: {
    isActive: false,
    theme: 'light',
    accentClassName: 'text-sky-600',
  },
  render: (args) => (
    <div className="w-56 rounded-2xl border border-slate-200 bg-white p-4">
      <CardMetric {...args} />
    </div>
  ),
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
