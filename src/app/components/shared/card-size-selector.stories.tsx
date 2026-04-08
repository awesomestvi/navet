import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import type { CardSize } from './card-size-selector';
import { CardSizeSelector } from './card-size-selector';

function CardSizeSelectorStory({ initialSize = 'medium' }: { initialSize?: CardSize }) {
  const [size, setSize] = useState<CardSize>(initialSize);
  return (
    <div className="flex items-center justify-center p-12">
      <div className="relative h-48 w-96 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="flex h-full items-center justify-center">
          <span className="text-sm text-white/60">
            Current size: <span className="font-semibold text-white">{size}</span>
          </span>
        </div>
        <CardSizeSelector currentSize={size} onSizeChange={setSize} />
      </div>
    </div>
  );
}

function RestrictedSizesStory() {
  const [size, setSize] = useState<CardSize>('small');
  return (
    <div className="flex items-center justify-center p-12">
      <div className="relative h-48 w-48 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="flex h-full items-center justify-center">
          <span className="text-xs text-white/60">{size}</span>
        </div>
        <CardSizeSelector
          currentSize={size}
          onSizeChange={setSize}
          allowedSizes={['small', 'medium', 'large']}
        />
      </div>
    </div>
  );
}

const meta = {
  title: 'Components/Shared/Card Size Selector',
  component: CardSizeSelectorStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Popover-based card size picker used in every card settings flow. Click the resize button (top-right corner) to open the popover.',
      },
    },
  },
} satisfies Meta<typeof CardSizeSelectorStory>;

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

export const Default: Story = {};

export const StartingLarge: Story = {
  args: { initialSize: 'large' },
};

export const RestrictedSizes: Story = {
  render: () => <RestrictedSizesStory />,
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
