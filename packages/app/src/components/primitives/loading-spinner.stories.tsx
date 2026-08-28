import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@navet/app/hooks';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import { Button } from './button';
import { LoadingSpinner } from './loading-spinner';

function FullScreenLoadingSpinnerStory({
  message,
  action,
}: Pick<ComponentProps<typeof LoadingSpinner>, 'message' | 'action'>) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div className={`min-h-[28rem] ${surface.appBg}`}>
      <div className="flex min-h-[28rem] items-center justify-center">
        <LoadingSpinner message={message} action={action} />
      </div>
    </div>
  );
}

const meta = {
  title: 'Components/Primitives/Loading Spinner',
  component: LoadingSpinner,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Theme-aware loading indicator for suspended sections and full-screen wait states. Keeps the API intentionally small: optional message plus full-screen layout.',
      },
    },
  },
  args: {
    message: 'Loading dashboard',
    fullScreen: false,
  },
} satisfies Meta<typeof LoadingSpinner>;

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

export const Default: Story = {};

export const FullScreen: Story = {
  args: {
    message: 'Connecting to Home Assistant',
  },
  render: (args) => <FullScreenLoadingSpinnerStory message={args.message} />,
};

export const FullScreenWithRecovery: Story = {
  args: {
    message: 'Starting your dashboard...',
    action: <Button variant="secondary">Back to login</Button>,
  },
  render: (args) => <FullScreenLoadingSpinnerStory {...args} />,
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
