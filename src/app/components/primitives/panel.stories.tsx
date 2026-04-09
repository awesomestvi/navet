import type { Meta, StoryObj } from '@storybook/react';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { Heading } from './heading';
import { Panel } from './panel';
import { Text } from './text';

function PanelStory({ muted = false }: { muted?: boolean }) {
  return (
    <Panel muted={muted} className="max-w-md">
      <Heading as="h3">{muted ? 'Advanced' : 'Weather card settings'}</Heading>
      <Text tone="muted" className="mt-2">
        {muted
          ? 'These controls are hidden by default because they affect performance on weaker hardware.'
          : 'Adjust refresh interval and choose which forecast details appear in the compact view.'}
      </Text>
    </Panel>
  );
}

const meta = {
  title: 'Components/Primitives/Panel',
  component: PanelStory,
  tags: ['autodocs'],
  args: {
    muted: false,
  },
  render: (args) => <PanelStory muted={args.muted} />,
  parameters: {
    docs: {
      description: {
        component:
          'Status: proposed. Shared section/container surface for ordinary content blocks. This should stay intentionally narrow and should not turn into a generic business card API.',
      },
    },
  },
} satisfies Meta<typeof PanelStory>;

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

export const Default: Story = {
  args: {
    muted: false,
  },
};

export const Muted: Story = {
  args: {
    muted: true,
  },
};
