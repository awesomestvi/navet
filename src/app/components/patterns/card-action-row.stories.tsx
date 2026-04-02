import type { Meta, StoryObj } from '@storybook/react';
import { Pencil, Settings, Trash2 } from 'lucide-react';
import { CardActionRow } from './card-action-row';

function CardActionRowStory({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
      <CardActionRow
        theme="glass"
        size={size}
        leftContent={
          <button
            type="button"
            aria-label="Edit"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80"
          >
            <Pencil className="h-4 w-4" />
          </button>
        }
        rightContent={
          <button
            type="button"
            aria-label="Settings"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80"
          >
            <Settings className="h-4 w-4" />
          </button>
        }
        overflowItems={[
          { key: 'rename', label: 'Rename', onSelect: () => {} },
          { key: 'duplicate', label: 'Duplicate', onSelect: () => {} },
          { key: 'delete', label: 'Delete', onSelect: () => {}, icon: Trash2 },
        ]}
      />
    </div>
  );
}

const meta = {
  title: 'Components/Patterns/Card Action Row',
  component: CardActionRowStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Composed card action row pattern for left-aligned controls, optional right-side actions, and overflow menus. Used by HVAC, vacuum, cover, and lighting card layouts.',
      },
    },
  },
} satisfies Meta<typeof CardActionRowStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Medium: Story = {};

export const Small: Story = {
  args: { size: 'small' },
};

export const Large: Story = {
  args: { size: 'large' },
};
