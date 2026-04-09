import type { Meta, StoryObj } from '@storybook/react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { LoadingSpinner } from './loading-spinner';

function FullScreenLoadingSpinnerStory({ message }: { message?: string }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div className={`min-h-[28rem] ${surface.appBg}`}>
      <div className="flex min-h-[28rem] items-center justify-center">
        <LoadingSpinner message={message} />
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

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
