import type { Meta, StoryObj } from '@storybook/react';
import { Info } from 'lucide-react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { Tooltip } from './tooltip';

const meta = {
  title: 'Components/Primitives/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  args: {
    content: 'Use a compact room name so the sidebar stays readable.',
    side: 'top',
    children: (
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white"
      >
        <Info className="h-4 w-4" />
      </button>
    ),
  },
  parameters: {
    docs: {
      description: {
        component:
          'Status: proposed. Lightweight hover/focus tooltip wrapper. Deferred decisions: portalling, collision handling, and richer delay behavior.',
      },
    },
  },
} satisfies Meta<typeof Tooltip>;

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
export const Top: Story = {};
export const Bottom: Story = { args: { side: 'bottom' } };

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
