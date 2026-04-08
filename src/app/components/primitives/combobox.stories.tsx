import type { Meta, StoryObj } from '@storybook/react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { Combobox } from './combobox';

const meta = {
  title: 'Components/Primitives/Combobox',
  component: Combobox,
  tags: ['autodocs'],
  args: {
    placeholder: 'Search entities',
    expanded: true,
    listboxId: 'storybook-combobox-listbox',
    children: (
      <div className="space-y-1">
        <button
          type="button"
          role="option"
          aria-selected="true"
          className="block w-full rounded-2xl px-3 py-2 text-left text-sm text-white hover:bg-white/10"
        >
          sensor.kitchen_power
        </button>
        <button
          type="button"
          role="option"
          className="block w-full rounded-2xl px-3 py-2 text-left text-sm text-white hover:bg-white/10"
        >
          sensor.living_room_power
        </button>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        component:
          'Status: proposed. Structural combobox shell for future shared autocomplete work. Intentionally leaves filtering, keyboard option management, and selection state to the caller until the app proves a stable shared behavior.',
      },
    },
  },
} satisfies Meta<typeof Combobox>;

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

export const Open: Story = {};
export const Closed: Story = { args: { expanded: false } };

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
