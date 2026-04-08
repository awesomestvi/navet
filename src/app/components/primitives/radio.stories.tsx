import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { Radio } from './radio';

function RadioStory({ disabled = false }: { disabled?: boolean }) {
  const [value, setValue] = useState('grid');

  return (
    <div className="space-y-3 text-sm text-white/80">
      {['grid', 'list'].map((option) => (
        <label
          key={option}
          htmlFor={`storybook-radio-${option}`}
          className="flex items-center gap-3"
        >
          <Radio
            id={`storybook-radio-${option}`}
            name="storybook-layout"
            checked={value === option}
            onChange={() => setValue(option)}
            disabled={disabled}
          />
          {option === 'grid' ? 'Grid layout' : 'List layout'}
        </label>
      ))}
    </div>
  );
}

const meta = {
  title: 'Components/Primitives/Radio',
  component: RadioStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Status: proposed. Minimal semantic radio primitive for future shared single-choice groups.',
      },
    },
  },
} satisfies Meta<typeof RadioStory>;

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
export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
