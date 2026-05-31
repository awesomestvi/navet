import type { Meta, StoryObj } from '@storybook/react';
import { Link } from './link';

const meta = {
  title: 'Components/Primitives/Link',
  component: Link,
  tags: ['autodocs'],
  args: {
    children: 'View release notes',
    href: '#',
    appearance: 'default',
    size: 'medium',
    target: undefined,
    showExternalIcon: false,
  },
  argTypes: {
    appearance: {
      control: 'select',
      options: ['default', 'subtle'],
    },
    size: {
      control: 'select',
      options: ['small', 'medium'],
    },
    showExternalIcon: {
      control: 'boolean',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Inline navigation primitive for contextual links in notifications, dialogs, and supporting copy. Use the default appearance for primary references, subtle for lower-emphasis links, and add the external icon when the link opens a new tab.',
      },
    },
  },
} satisfies Meta<typeof Link>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Default links should read as normal navigation or supporting actions, with enough emphasis to be discoverable inline.',
      },
    },
  },
};

export const Subtle: Story = {
  args: {
    appearance: 'subtle',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Use the subtle appearance when the link is supportive metadata instead of the primary piece of copy.',
      },
    },
  },
};

export const InlineText: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Links are primarily meant to sit inside surrounding copy or short helper text, not replace a button.',
      },
    },
  },
  render: (args) => (
    <p className="max-w-xl text-sm leading-6 text-white/80">
      View the full changelog before updating in{' '}
      <Link {...args} href="https://example.com/releases/navet" target="_blank" showExternalIcon>
        release notes
      </Link>
      .
    </p>
  ),
};

export const External: Story = {
  args: {
    children: 'View release notes',
    href: 'https://example.com/releases/navet',
    target: '_blank',
    showExternalIcon: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Add the external icon only when the destination opens a new tab or clearly leaves the current Navet context.',
      },
    },
  },
};
