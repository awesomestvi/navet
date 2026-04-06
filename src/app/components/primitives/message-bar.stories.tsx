import type { Meta, StoryObj } from '@storybook/react';
import { AlertTriangle, CheckCircle2, Info as InfoIcon, WifiOff } from 'lucide-react';
import { MessageBar } from './message-bar';

const meta = {
  title: 'Components/Primitives/MessageBar',
  component: MessageBar,
  tags: ['autodocs'],
  args: {
    tone: 'info',
    title: (
      <span className="inline-flex items-center gap-2">
        <InfoIcon className="h-4 w-4" aria-hidden="true" />
        <span>Heads up</span>
      </span>
    ),
    children:
      'Changing this card to live blur mode may affect performance on low-power dashboards.',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Status: in-progress. Shared inline status/message pattern for local guidance, warnings, and errors inside panels and forms.',
      },
    },
  },
} satisfies Meta<typeof MessageBar>;

export default meta;

type Story = StoryObj<typeof meta>;
export const Info: Story = {};
export const Success: Story = {
  args: {
    tone: 'success',
    title: (
      <span className="inline-flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        <span>Saved</span>
      </span>
    ),
    children: 'Your room layout preferences were updated.',
  },
};
export const Warning: Story = {
  args: {
    tone: 'warning',
    title: (
      <span className="inline-flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        <span>Performance</span>
      </span>
    ),
    children: 'Animated blur is reduced automatically on low effects-quality settings.',
  },
};
export const ErrorState: Story = {
  args: {
    tone: 'error',
    title: (
      <span className="inline-flex items-center gap-2">
        <WifiOff className="h-4 w-4" aria-hidden="true" />
        <span>Connection failed</span>
      </span>
    ),
    children: 'The dashboard could not reach Home Assistant with the current URL.',
  },
};
