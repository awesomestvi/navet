import type { Meta, StoryObj } from '@storybook/react';
import { Heading } from './heading';
import { Panel } from './panel';
import { Text } from './text';

const meta = {
  title: 'Components/Primitives/Panel',
  component: Panel,
  tags: ['autodocs'],
  args: {
    children: null,
  },
  parameters: {
    docs: {
      description: {
        component:
          'Status: proposed. Shared section/container surface for ordinary content blocks. This should stay intentionally narrow and should not turn into a generic business card API.',
      },
    },
  },
} satisfies Meta<typeof Panel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Panel className="max-w-md">
      <Heading as="h3">Weather card settings</Heading>
      <Text tone="muted" className="mt-2">
        Adjust refresh interval and choose which forecast details appear in the compact view.
      </Text>
    </Panel>
  ),
};

export const Muted: Story = {
  render: () => (
    <Panel muted className="max-w-md">
      <Heading as="h4">Advanced</Heading>
      <Text tone="muted" className="mt-2">
        These controls are hidden by default because they affect performance on weaker hardware.
      </Text>
    </Panel>
  ),
};
