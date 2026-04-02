import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { useTheme } from '@/app/hooks';
import { ColorInputSwatch } from './color-input-swatch';

function PickerModeStory() {
  const [value, setValue] = useState('#f97316');
  const { theme } = useTheme();
  const titleClassName = theme === 'light' ? 'text-gray-900' : 'text-white';
  const bodyClassName = theme === 'light' ? 'text-gray-600' : 'text-white/60';

  return (
    <div className="flex items-center gap-4">
      <ColorInputSwatch
        value={value}
        mode="picker"
        size="large"
        selected
        ariaLabel="Choose custom accent"
        onChange={setValue}
      />
      <div className="min-w-0">
        <p className={`text-sm font-medium ${titleClassName}`}>Custom accent</p>
        <p className={`text-sm ${bodyClassName}`}>{value}</p>
      </div>
    </div>
  );
}

const meta = {
  title: 'Components/Primitives/Color Input Swatch',
  component: ColorInputSwatch,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Color swatch input used for preset and custom accent selection. Includes both static swatch mode and interactive picker mode.',
      },
    },
  },
  args: {
    value: '#f97316',
    ariaLabel: 'Accent color',
    size: 'medium',
    selected: false,
    mode: 'swatch',
  },
  argTypes: {
    onClick: { action: 'clicked' },
  },
} satisfies Meta<typeof ColorInputSwatch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SwatchRow: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-3">
      <ColorInputSwatch {...args} value="#f97316" selected ariaLabel="Orange accent" />
      <ColorInputSwatch {...args} value="#3b82f6" ariaLabel="Blue accent" />
      <ColorInputSwatch {...args} value="#22c55e" ariaLabel="Green accent" />
      <ColorInputSwatch {...args} value="#ec4899" ariaLabel="Pink accent" />
      <ColorInputSwatch {...args} value="#14b8a6" ariaLabel="Teal accent" />
    </div>
  ),
};

export const PickerMode: Story = {
  render: () => <PickerModeStory />,
};
