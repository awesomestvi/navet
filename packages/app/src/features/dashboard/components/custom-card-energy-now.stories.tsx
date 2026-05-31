import {
  type CardSize,
  getCardSizeOverlayStyle,
} from '@navet/app/components/shared/card-size-selector';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import type { Meta, StoryObj } from '@storybook/react';
import { EnergyNowDashboardWidget } from './widgets/energy-now-dashboard-widget';

type EnergyNowStoryArgs = {
  size: Extract<CardSize, 'small' | 'medium' | 'large'>;
};

function EnergyNowStoryFrame({ size }: EnergyNowStoryArgs) {
  return (
    <div style={getCardSizeOverlayStyle(size)}>
      <EnergyNowDashboardWidget data={{ selectedSourceId: 'sensor.home_energy_now' }} size={size} />
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
  parameters: {
    docs: {
      description: {
        component:
          'Energy Now custom card. In dark theme, the outer shell should inherit the shared `BaseCard` inactive surface, while the accent remains inside the chart/content rather than tinting the whole card border/background.',
      },
    },
  },
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
  },
};
