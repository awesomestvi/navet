import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { SectionCustomizeButton } from './section-customize-button';

function SectionCustomizeButtonStory() {
  const [isEditMode, setIsEditMode] = useState(false);
  return (
    <div className="p-8">
      <SectionCustomizeButton
        isEditMode={isEditMode}
        onToggle={() => setIsEditMode((current) => !current)}
      />
    </div>
  );
}

const meta = {
  title: 'App Shell/Section Customize Button',
  component: SectionCustomizeButtonStory,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof SectionCustomizeButtonStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Toggle: Story = {};
