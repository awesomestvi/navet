import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { Checkbox } from './checkbox';

function CheckboxStory({
  appearance = 'default',
  defaultChecked = false,
  disabled = false,
  palette = 'accent',
}: {
  appearance?: 'default' | 'secondary';
  defaultChecked?: boolean;
  disabled?: boolean;
  palette?: 'accent' | 'blue' | 'purple' | 'pink' | 'red' | 'orange' | 'yellow' | 'green' | 'teal';
}) {
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
        appearance={appearance}
        disabled={disabled}
        palette={palette}
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
    appearance: 'default',
    defaultChecked: false,
    disabled: false,
    palette: 'accent',
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
export const SecondaryRed: Story = {
  args: {
    appearance: 'secondary',
    defaultChecked: true,
    palette: 'red',
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
