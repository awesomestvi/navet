import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { Switch } from './switch';

function SwitchStory({ defaultChecked = true, disabled = false }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div className="flex items-center gap-3 text-sm text-white/80">
      <span id="storybook-switch-label">Motion alerts</span>
      <Switch
        checked={checked}
        onCheckedChange={setChecked}
        disabled={disabled}
        aria-labelledby="storybook-switch-label"
      />
    </div>
  );
}

const meta = {
  title: 'Components/Primitives/Switch',
  component: SwitchStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Status: proposed. Minimal switch primitive for boolean settings with on/off wording.',
      },
    },
  },
} satisfies Meta<typeof SwitchStory>;

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
export const On: Story = { args: { defaultChecked: true } };
export const Off: Story = { args: { defaultChecked: false } };
export const Disabled: Story = { args: { defaultChecked: true, disabled: true } };

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
