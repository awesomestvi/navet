import { BaseCard } from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import type { Meta, StoryObj } from '@storybook/react';
import { Gauge, Plus, Rss } from 'lucide-react';
import { CardEmptyState } from './card-empty-state';

function CardEmptyStateStory({
  size = 'medium',
  withAction = true,
}: {
  size?: CardSize;
  withAction?: boolean;
}) {
  return (
    <div style={{ width: size === 'small' ? 160 : 320, height: size === 'large' ? 320 : 160 }}>
      <BaseCard size={size}>
        <CardEmptyState
          title="No feeds selected"
          description="Select one or more providers for this card."
          icon={Rss}
          actionLabel={withAction ? 'Configure RSS providers' : undefined}
          actionIcon={Plus}
          onAction={withAction ? () => {} : undefined}
          size={size}
          accentColor="#3b82f6"
        />
      </BaseCard>
    </div>
  );
}

const meta = {
  title: 'Components/Patterns/Card Empty State',
  component: CardEmptyStateStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
    withAction: {
      control: 'boolean',
    },
  },
  args: {
    size: 'medium',
    withAction: true,
  },
  parameters: {
    docs: {
      description: {
        component:
          'Compact card-level empty state with an icon tile, short copy, and optional action.',
      },
    },
  },
} satisfies Meta<typeof CardEmptyStateStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

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
  args: {
    size: 'large',
    withAction: false,
  },
};

export const SensorGroup: Story = {
  render: () => (
    <div className="h-40 w-80">
      <BaseCard size="medium">
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
      </BaseCard>
    </div>
  ),
};
