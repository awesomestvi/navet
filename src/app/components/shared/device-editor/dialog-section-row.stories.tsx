import type { Meta, StoryObj } from '@storybook/react';
import { Lightbulb, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { DialogSectionRow } from './dialog-section-row';

function DialogSectionRowPanel({ children }: { children: ReactNode }) {
  return (
    <div className="w-[22rem] rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
      {children}
    </div>
  );
}

function DialogSectionRowStory() {
  return (
    <DialogSectionRowPanel>
      <DialogSectionRow label="Brightness">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <Sun className="h-4 w-4 text-white/60" />
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-3/5 rounded-full bg-amber-400" />
          </div>
          <span className="text-xs text-white/60">60%</span>
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
      <DialogSectionRow label="Room">
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
          Living Room
        </div>
      </DialogSectionRow>
    </DialogSectionRowPanel>
  );
}

const meta = {
  title: 'Components/Shared/Device Editor/Dialog Section Row',
  component: DialogSectionRowStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Layout helper for settings dialogs. Use it to pair a short section label with a control, selector, slider, or preview block so dialog forms keep consistent spacing and hierarchy.',
      },
    },
  },
} satisfies Meta<typeof DialogSectionRowStory>;

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

export const SettingsForm: Story = {
  render: () => <DialogSectionRowStory />,
};

export const SingleLabeledRow: Story = {
  render: () => (
    <DialogSectionRowPanel>
      <DialogSectionRow label="Brightness">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <Sun className="h-4 w-4 text-white/60" />
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-3/5 rounded-full bg-amber-400" />
          </div>
          <span className="text-xs text-white/60">60%</span>
        </div>
      </DialogSectionRow>
    </DialogSectionRowPanel>
  ),
};

export const UnlabeledRow: Story = {
  render: () => (
    <DialogSectionRowPanel>
      <DialogSectionRow>
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <Lightbulb className="h-4 w-4 text-white/60" />
          <span className="text-sm text-white/80">
            Use an unlabeled row when surrounding copy already makes the control obvious.
          </span>
        </div>
      </DialogSectionRow>
    </DialogSectionRowPanel>
  ),
};
