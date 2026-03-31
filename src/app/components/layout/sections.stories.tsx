import type { Meta, StoryObj } from '@storybook/react';
import { LightsSection, TasksSection } from './sections';

function SectionsStory() {
  return (
    <div className="space-y-8 p-8">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-white/80">Tasks Section</h3>
        <TasksSection />
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold text-white/80">Lights Section</h3>
        <LightsSection />
      </div>
    </div>
  );
}

const meta = {
  title: 'App Shell/Sections',
  component: SectionsStory,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SectionsStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EmptyStates: Story = {};
