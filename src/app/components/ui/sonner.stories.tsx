import type { Meta, StoryObj } from '@storybook/react';
import { toast } from 'sonner';
import { Toaster } from './sonner';

function SonnerStory() {
  return (
    <div className="flex items-center justify-center p-12">
      <Toaster richColors />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => toast.success('Settings saved successfully')}
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"
        >
          Success toast
        </button>
        <button
          type="button"
          onClick={() => toast.error('Unable to connect to Home Assistant')}
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
        >
          Error toast
        </button>
      </div>
    </div>
  );
}

const meta = {
  title: 'Components/Base/Sonner Toaster',
  component: SonnerStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SonnerStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
