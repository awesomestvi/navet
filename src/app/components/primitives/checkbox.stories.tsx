import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { Checkbox } from './checkbox';

function CheckboxStory({ defaultChecked = false, disabled = false }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <label
      htmlFor="primitive-checkbox-story"
      className="flex items-center gap-3 text-sm text-white/80"
    >
      <Checkbox
        id="primitive-checkbox-story"
        checked={checked}
        onCheckedChange={(value) => setChecked(Boolean(value))}
        disabled={disabled}
      />
      Show hidden entities
    </label>
  );
}

const meta = {
  title: 'Components/Primitives/Checkbox',
  component: CheckboxStory,
  tags: ['autodocs'],
  args: {
    defaultChecked: false,
    disabled: false,
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Canonical checkbox primitive for compact form rows and list selection.',
      },
    },
  },
} satisfies Meta<typeof CheckboxStory>;

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
export const Unchecked: Story = { args: { defaultChecked: false } };
export const Checked: Story = { args: { defaultChecked: true } };
export const Disabled: Story = { args: { defaultChecked: true, disabled: true } };

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
