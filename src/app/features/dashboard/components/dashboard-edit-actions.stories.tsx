import type { Meta, StoryObj } from '@storybook/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DashboardEditActions, DashboardResizeTrigger } from './dashboard-edit-actions';

function DashboardEditActionsStory() {
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');

  return (
    <div className="p-8">
      <DashboardEditActions
        isEditMode
        onDeleteCard={() => {}}
        onRemoveFromLayout={() => {}}
        onRemoveEntity={() => {}}
      >
        <div className="relative h-52 w-80 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
          <h3 className="text-sm font-semibold text-white">Editable Card</h3>
          <p className="mt-2 text-xs text-white/60">Overlay controls in edit mode</p>

          <div className="absolute right-3 top-3">
            <DashboardResizeTrigger
              cardSize={size}
              allowedSizes={['small', 'medium', 'large']}
              onSizeChange={(next) => setSize(next as 'small' | 'medium' | 'large')}
            />
          </div>

          <button
            type="button"
            data-dashboard-edit-action="delete-card"
            data-card-id="demo-card"
            className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </DashboardEditActions>
    </div>
  );
}

const meta = {
  title: 'Dashboard/Edit Actions',
  component: DashboardEditActionsStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DashboardEditActionsStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
