import type { Meta, StoryObj } from '@storybook/react';
import { Settings2, Trash2 } from 'lucide-react';
import { Button } from './button';

const meta = {
  title: 'Components/Primitives/Button',
  component: Button,
  tags: ['autodocs'],
  args: {
    children: 'Save changes',
    variant: 'primary',
    size: 'default',
    loading: false,
    disabled: false,
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['compact', 'small', 'default', 'touch'],
    },
  },
  parameters: {
    docs: {
      description: {
        component: [
          'Canonical action-button primitive used across dashboard controls, settings forms, dialogs, and compact icon actions.',
          '',
          'What this story proves:',
          '- Primary and secondary emphasis levels for common action hierarchy.',
          '- Disabled behavior for non-interactive and pending states.',
          '- Icon-only composition with explicit accessibility labels.',
          '',
          'Use this story when:',
          '- Prefer this primitive over feature-local button wrappers when behavior and semantics are standard.',
          '- Always provide `label` for `iconOnly` buttons so assistive technologies expose meaningful names.',
          '- Keep variant choice tied to action priority, not visual preference.',
          '',
          'Review before merging:',
          '- Verify readable contrast and affordance across active and disabled states.',
          '- Verify icon-only controls remain hit-target compliant for compact, small, and default sizes.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Default primary action button for the most prominent action in a local flow.',
      },
    },
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
  },
  parameters: {
    docs: {
      description: {
        story: 'Secondary-emphasis action for supporting or lower-priority operations.',
      },
    },
  },
};

export const DestructiveButton: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="ghost" size="small">
        Cancel
      </Button>
      <Button variant="soft" size="small">
        Save changes
      </Button>
      <Button
        variant="destructive"
        size="small"
        leading={<Trash2 className="h-4 w-4" aria-hidden="true" />}
      >
        Delete
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Canonical destructive button treatment for irreversible or removal actions. It preserves the standard Button geometry, focus behavior, loading state, and disabled semantics.',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled state showing non-interactive styling while preserving visual context.',
      },
    },
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Button size="compact" variant="secondary">
          Compact
        </Button>
        <Button size="small" variant="secondary">
          Small
        </Button>
        <Button size="default" variant="secondary">
          Default
        </Button>
        <Button size="touch" variant="secondary">
          Touch-forward
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button iconOnly label="Compact settings" variant="subtle" size="compact">
          <Settings2 className="h-4 w-4" />
        </Button>
        <Button iconOnly label="Small settings" variant="subtle" size="small">
          <Settings2 className="h-4 w-4" />
        </Button>
        <Button iconOnly label="Default settings" variant="subtle" size="default">
          <Settings2 className="h-4 w-4" />
        </Button>
        <Button iconOnly label="Touch-forward settings" variant="subtle" size="touch">
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Side-by-side comparison of Navet’s 36 px compact/small, 40 px default, and exceptional 42 px touch-forward tiers for text and icon-only buttons.',
      },
    },
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
