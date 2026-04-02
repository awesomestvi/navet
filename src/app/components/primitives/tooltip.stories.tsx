import type { Meta, StoryObj } from '@storybook/react';
import { Info } from 'lucide-react';
import { Tooltip } from './tooltip';

const meta = {
  title: 'Components/Primitives/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  args: {
    content: 'Use a compact room name so the sidebar stays readable.',
    side: 'top',
    children: (
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white"
      >
        <Info className="h-4 w-4" />
      </button>
    ),
  },
  parameters: {
    docs: {
      description: {
        component:
          'Status: proposed. Lightweight hover/focus tooltip wrapper. Deferred decisions: portalling, collision handling, and richer delay behavior.',
      },
    },
  },
} satisfies Meta<typeof Tooltip>;

export default meta;

type Story = StoryObj<typeof meta>;
export const Top: Story = {};
export const Bottom: Story = { args: { side: 'bottom' } };
