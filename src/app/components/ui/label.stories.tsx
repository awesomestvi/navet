import type { Meta, StoryObj } from '@storybook/react';
import { Label } from './label';

const meta = {
  title: 'Components/Base/Label',
  component: Label,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Label>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="demo-input" className="text-white/80">
        Device name
      </Label>
      <input
        id="demo-input"
        className="w-64 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
        defaultValue="Living room lamp"
      />
    </div>
  ),
};
