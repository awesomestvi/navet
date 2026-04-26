import type { Meta, StoryObj } from '@storybook/react';
import { type CardSize, cardSizeOverlayClass } from '@/app/components/shared/card-size-selector';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { getMockEnergyOverview } from '../../energy/data/mock-energy-dashboard';
import { EnergyNowDashboardCardView } from './widgets/energy-now-dashboard-widget';

type EnergyNowStoryArgs = {
  size: Extract<CardSize, 'small' | 'medium' | 'large'>;
  trend?: Array<{ label: string; value: number; secondaryValue?: number }>;
};

const overview = getMockEnergyOverview('live');
const storyTrend = [
  { label: '-45m', value: 9.2, secondaryValue: 6.8 },
  { label: '-30m', value: 9.9, secondaryValue: 7.1 },
  { label: '-15m', value: 10.8, secondaryValue: 7.5 },
  { label: 'Now', value: 11.7, secondaryValue: 7.8 },
];

function EnergyNowStoryFrame({ size, trend = storyTrend }: EnergyNowStoryArgs) {
  return (
    <div className={cardSizeOverlayClass[size]}>
      <EnergyNowDashboardCardView
        title="Energy today"
        currentLoadW={overview.totals.currentLoadW}
        todayUsageKWh={56.5}
        trend={trend}
        accentColor="#22d3ee"
        size={size}
      />
    </div>
  );
}

const meta = {
  title: 'Cards/Custom/Energy Now',
  component: EnergyNowStoryFrame,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<EnergyNowStoryArgs>;

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

type Story = StoryObj<EnergyNowStoryArgs>;

export const Playground: Story = {
  args: {
    size: 'medium',
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

export const EmptyState: Story = {
  args: {
    size: 'medium',
    trend: [{ label: 'Now', value: 11.7, secondaryValue: 7.8 }],
  },
};
