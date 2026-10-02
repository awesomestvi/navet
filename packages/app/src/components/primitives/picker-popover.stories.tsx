import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ColorPickerPanel } from './color-picker-panel';
import { PickerPopover } from './picker-popover';

function Example() {
  const [value, setValue] = useState('#f97316');
  return (
    <div className="w-64">
      <PickerPopover
        label="Color picker"
        trigger={
          <button type="button" className="h-10 rounded-xl border border-current/20 px-3">
            Color picker
          </button>
        }
      >
        <ColorPickerPanel value={value} onChange={setValue} />
      </PickerPopover>
    </div>
  );
}
const meta = {
  title: 'Components/Primitives/Picker Popover',
  component: PickerPopover,
  tags: ['autodocs'],
  args: {
    label: 'Color picker',
    trigger: <button type="button">Color picker</button>,
    children: <span>Picker content</span>,
  },
} satisfies Meta<typeof PickerPopover>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = { render: () => <Example /> };
export const Docs: Story = { parameters: { docsOnly: true } };
