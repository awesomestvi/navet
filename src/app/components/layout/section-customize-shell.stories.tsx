import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { SectionCustomizeShell } from './section-customize-shell';

function SectionCustomizeShellStory() {
  const [isEditMode, setIsEditMode] = useState(false);

  return (
    <div className="p-8">
      <SectionCustomizeShell
        isEditMode={isEditMode}
        onToggle={() => setIsEditMode((current) => !current)}
      >
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <h3 className="text-lg font-semibold text-white">Dashboard Section</h3>
          <p className="mt-2 text-sm text-white/60">
            Use the top-right control to toggle edit mode.
          </p>
        </div>
      </SectionCustomizeShell>
    </div>
  );
}

const meta = {
  title: 'App Shell/Section Customize Shell',
  component: SectionCustomizeShellStory,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof SectionCustomizeShellStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
