import type { Meta, StoryObj } from '@storybook/react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { useTheme } from '@/app/hooks';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { buildCustomCard, CustomWidgetStoryFrame } from '@/app/storybook/story-frames';
import { RSSFeedCardView } from './view';

function RSSFeedStory({
  size = 'large',
  tintColor = '#3b82f6',
}: {
  size?: CardSize;
  tintColor?: string;
}) {
  return <CustomWidgetStoryFrame card={buildCustomCard('rss', size, { tintColor })} />;
}

function RSSEmptyStory({
  size = 'medium',
  variant = 'no-selection',
}: {
  size?: CardSize;
  variant?: 'no-providers' | 'no-selection' | 'no-articles';
}) {
  const { theme, accentColor } = useTheme();

  return (
    <div style={{ width: size === 'small' ? 160 : 320, height: size === 'large' ? 320 : 160 }}>
      <RSSFeedCardView
        size={size}
        theme={theme}
        accentColor={accentColor}
        colors={{
          rss: {
            gradient: 'from-sky-500/20 via-blue-500/10 to-transparent',
            border: 'border-white/10',
            glow: 'from-sky-300/20',
          },
        }}
        tintColor="#3b82f6"
        isSmall={size === 'small'}
        isMedium={size === 'medium'}
        latestArticle={null}
        items={[]}
        selectedProviders={[]}
        activeProviderId="all"
        onActiveProviderChange={() => {}}
        handleArticleClick={() => {}}
        isLoading={false}
        error={null}
        hasConfiguredProviders={variant !== 'no-providers'}
        hasSelectedProviders={variant !== 'no-providers' && variant !== 'no-selection'}
        onOpenSettings={() => {}}
      />
    </div>
  );
}

const meta = {
  title: 'Cards/Custom/RSS Feed',
  component: RSSFeedStory,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
    tintColor: {
      control: 'color',
    },
  },
  args: {
    size: 'large',
    tintColor: '#3b82f6',
  },
  parameters: {
    docs: {
      description: {
        component: 'Custom RSS Feed card rendered through the dashboard widget card runtime.',
      },
    },
  },
} satisfies Meta<typeof RSSFeedStory>;

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

export const Playground: Story = {};

export const Small: Story = {
  args: {
    size: 'small',
  },
};

export const Medium: Story = {
  args: {
    size: 'medium',
  },
};

export const Large: Story = {
  args: {
    size: 'large',
  },
};

export const LargeLightTint: Story = {
  args: {
    size: 'large',
    tintColor: '#f59e0b',
  },
};

export const LargeDarkTint: Story = {
  args: {
    size: 'large',
    tintColor: '#1d4ed8',
  },
};

export const EmptyNoProviders: Story = {
  render: () => <RSSEmptyStory size="medium" variant="no-providers" />,
};

export const EmptyNoSelection: Story = {
  render: () => <RSSEmptyStory size="medium" variant="no-selection" />,
};

export const EmptyNoArticles: Story = {
  render: () => <RSSEmptyStory size="large" variant="no-articles" />,
};
