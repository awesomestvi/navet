import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { SectionCustomizeShell } from './section-customize-shell';

function SectionCustomizeShellStory() {
  const [isEditMode, setIsEditMode] = useState(false);

  return (
    <div className="p-8">
      <SectionCustomizeShell
        isEditMode={isEditMode}
        onToggle={() => setIsEditMode((current) => !current)}
        className="relative"
      >
        <div className="space-y-4">
          <div className="pr-16">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
              Example section
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white">Living Room Lights</h3>
            <p className="mt-2 max-w-xl text-sm text-white/60">
              This wrapper is used when a full section needs a customize toggle pinned in the corner
              while the section content below remains unchanged.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <p className="text-sm font-semibold text-white">Ceiling</p>
              <p className="mt-1 text-sm text-white/60">Warm white, 68%</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <p className="text-sm font-semibold text-white">Window Lamp</p>
              <p className="mt-1 text-sm text-white/60">Off</p>
            </div>
          </div>

          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-xs text-white/55">
            {isEditMode
              ? 'Edit mode is active. In the real app, this is where draggable cards and section controls become editable.'
              : 'Use this shell when you want the section itself to own the customize affordance, instead of manually positioning the button in each section implementation.'}
          </div>
        </div>
      </SectionCustomizeShell>
    </div>
  );
}

const meta = {
  title: 'App Shell/Header/Section Customize Shell',
  component: SectionCustomizeShellStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Layout wrapper for dashboard sections that need a pinned customize toggle. Use it when the section should own both the content and the top-right customize affordance, instead of placing the button manually in every section implementation.',
      },
    },
  },
} satisfies Meta<typeof SectionCustomizeShellStory>;

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

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Shows the intended usage: wrap an entire section with this shell so the customize button stays anchored in the top-right corner while the section body renders normally underneath it.',
      },
    },
  },
};
