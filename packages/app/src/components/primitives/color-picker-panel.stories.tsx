import { PRESET_COLORS } from '@navet/app/constants/light-constants';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ColorPickerPanel } from './color-picker-panel';

function Example({ compact = false }: { compact?: boolean }) {
  const [value, setValue] = useState('#f97316');
  return (
    <div className="w-64">
      <ColorPickerPanel
        value={value}
        onChange={setValue}
        compact={compact}
        presets={PRESET_COLORS}
      />
    </div>
  );
}
const meta = {
  title: 'Components/Primitives/Color Picker Panel',
  component: ColorPickerPanel,
  tags: ['autodocs'],
  args: { value: '#f97316', onChange: () => {} },
} satisfies Meta<typeof ColorPickerPanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = { render: () => <Example /> };
export const Docs: Story = { parameters: { docsOnly: true } };

export const LightControls: Story = { render: () => <Example compact /> };
