import type { Meta, StoryObj } from '@storybook/react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { OverlayScrollArea } from './overlay-scroll-area';

function OverlayScrollAreaStory({ itemCount = 18 }: { itemCount?: number }) {
  return (
    <div className="h-56 w-80 rounded-2xl border border-white/10 bg-white/8 p-4 text-white">
      <OverlayScrollArea className="h-full" contentClassName="space-y-2 pr-3">
        {Array.from({ length: itemCount }, (_, index) => (
          <div
            key={`item-${index + 1}`}
            className="rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-sm"
          >
            Scroll item {index + 1}
          </div>
        ))}
      </OverlayScrollArea>
    </div>
  );
}

const meta = {
  title: 'Components/Primitives/Overlay Scroll Area',
  component: OverlayScrollAreaStory,
  tags: ['autodocs'],
  args: {
    itemCount: 18,
  },
  parameters: {
    docs: {
      description: {
        component:
          'Custom overlay scrollbar for constrained card content. The native scrollbar remains hidden so card scroll affordances look consistent across browsers.',
      },
    },
  },
} satisfies Meta<typeof OverlayScrollAreaStory>;

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

export const Overflowing: Story = {};

export const NoOverflow: Story = {
  args: {
    itemCount: 3,
  },
};
