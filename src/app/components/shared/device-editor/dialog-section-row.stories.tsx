import type { Meta, StoryObj } from '@storybook/react';
import { Lightbulb, Sun } from 'lucide-react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { DialogSectionRow } from './dialog-section-row';

const meta = {
  title: 'Components/Shared/Device Editor/Dialog Section Row',
  component: DialogSectionRow,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Standard labeled row used throughout device settings dialogs. Provides consistent label typography and spacing for any control.',
      },
    },
  },
} satisfies Meta<typeof DialogSectionRow>;

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

export const WithLabel: Story = {
  args: {
    label: 'Brightness',
    children: (
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <Sun className="h-4 w-4 text-white/60" />
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-3/5 rounded-full bg-amber-400" />
        </div>
        <span className="text-xs text-white/60">60%</span>
      </div>
    ),
  },
};

export const WithoutLabel: Story = {
  args: {
    children: (
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <Lightbulb className="h-4 w-4 text-white/60" />
        <span className="text-sm text-white/80">Some control without a label</span>
      </div>
    ),
  },
};

export const Stacked: Story = {
  args: {
    children: null,
  },
  render: () => (
    <div className="w-72 space-y-0 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
      <DialogSectionRow label="Room">
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
          Living Room
        </div>
      </DialogSectionRow>
      <DialogSectionRow label="Icon">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
            <Lightbulb className="h-4 w-4 text-amber-400" />
          </div>
          <span className="text-sm text-white/60">Lightbulb</span>
        </div>
      </DialogSectionRow>
      <DialogSectionRow label="Size">
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
          Medium (2 × 1)
        </div>
      </DialogSectionRow>
    </div>
  ),
};

export const Docs: Story = {
  args: {
    children: null,
  },
  parameters: {
    docsOnly: true,
  },
};
