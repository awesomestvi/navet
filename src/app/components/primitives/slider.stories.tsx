import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { Slider } from './slider';

function StatefulSlider(args: React.ComponentProps<typeof Slider>) {
  const [value, setValue] = useState(args.value);

  return (
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-6">
      <Slider
        {...args}
        value={value}
        onValueChange={(nextValue) => {
          setValue(nextValue);
          args.onValueChange(nextValue);
        }}
      />
      <div className="mt-4 text-sm text-white/70">{Math.round(value)}%</div>
    </div>
  );
}

const meta = {
  title: 'Components/Primitives/Slider',
  component: StatefulSlider,
  tags: ['autodocs'],
  args: {
    value: 42,
    ariaLabel: 'Volume',
    onValueChange: () => {},
    rootClassName: 'relative flex h-6 w-full items-center touch-none select-none',
    trackClassName: 'relative h-px grow rounded-full bg-white/20',
    rangeClassName: 'absolute h-full rounded-full',
    thumbClassName: 'block h-4 w-4 rounded-full outline-none',
    rangeStyle: {
      background: 'linear-gradient(90deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.72) 100%)',
      boxShadow: '0 0 18px rgba(255,255,255,0.18)',
    },
    thumbStyle: {
      backgroundColor: '#ffffff',
      boxShadow: '0 0 0 1px rgba(255,255,255,0.16), 0 0 14px rgba(255,255,255,0.18)',
    },
  },
  parameters: { docs: { description: {} } },
} satisfies Meta<typeof StatefulSlider>;

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

export const Accent: Story = {
  args: {
    rangeStyle: {
      background: 'linear-gradient(90deg, rgba(125,211,252,0.96) 0%, rgba(34,211,238,0.84) 100%)',
      boxShadow: '0 0 18px rgba(34,211,238,0.24)',
    },
    thumbStyle: {
      backgroundColor: '#7dd3fc',
      boxShadow: '0 0 0 1px rgba(125,211,252,0.2), 0 0 14px rgba(34,211,238,0.22)',
    },
  },
};

export const Compact: Story = {
  args: {
    rootClassName: 'relative flex h-5 w-full items-center touch-none select-none',
    thumbClassName: 'block h-4 w-4 rounded-full outline-none',
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
