import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
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
  parameters: { layout: 'padded', docs: { description: {} } },
} satisfies Meta<typeof SectionCustomizeButtonStory>;

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

export const Toggle: Story = {};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
