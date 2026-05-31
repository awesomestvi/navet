import type { Meta, StoryObj } from '@storybook/react';
import { Settings2 } from 'lucide-react';
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
      options: ['compact', 'small', 'default'],
    },
  },
  parameters: {
    docs: {
      description: {
        component: [
          'Canonical action-button primitive used across dashboard controls, settings forms, dialogs, and compact icon actions.',
          '',
          'What this page covers:',
          '- Primary and secondary emphasis levels for common action hierarchy.',
          '- Disabled behavior for non-interactive and pending states.',
          '- Icon-only composition with explicit accessibility labels.',
          '',
          'Usage notes:',
          '- Prefer this primitive over feature-local button wrappers when behavior and semantics are standard.',
          '- Always provide `label` for `iconOnly` buttons so assistive technologies expose meaningful names.',
          '- Keep variant choice tied to action priority, not visual preference.',
          '',
          'Review expectations:',
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

export const IconButtons: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button iconOnly label="Open settings" variant="subtle" size="compact">
        <Settings2 className="h-4 w-4" />
      </Button>
      <Button iconOnly label="Open settings" variant="subtle" size="small">
        <Settings2 className="h-4 w-4" />
      </Button>
      <Button iconOnly label="Open settings" variant="subtle" size="default">
        <Settings2 className="h-4 w-4" />
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Icon-only button usage across supported sizes, including required accessible labeling via the `label` prop.',
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
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Side-by-side comparison for text and icon-only buttons. `default` stays unchanged, `small` is the comfortable reduced tier, and `compact` is the dense tier for tight control rows.',
      },
    },
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
