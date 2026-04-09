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
  title: 'App Shell/Header/Section Customize Button',
  component: SectionCustomizeButtonStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Small header-level toggle used to enter or exit section customization mode. Use this when a section only needs the control itself, without any layout wrapper.',
      },
    },
  },
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

export const Toggle: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Shows the standalone customize toggle. Click it to see how the button changes between normal and editing states.',
      },
    },
  },
};
