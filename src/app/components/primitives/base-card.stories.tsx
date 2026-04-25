import type { Meta, StoryObj } from '@storybook/react';
import { Lightbulb, Moon, Sparkles, SunMedium } from 'lucide-react';
import type { ComponentProps } from 'react';
import { EntityCardHeaderIcon } from '@/app/components/primitives/entity-card-header-icon';
import { RoundControlButton } from '@/app/components/primitives/round-control-button';
import type { CardSize } from '@/app/components/shared/card-size';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { EntityCardStoryFrame } from '@/app/storybook/story-frames';
import { BaseCard } from './base-card';

const SIZES: CardSize[] = [
  'tiny',
  'extra-small',
  'small',
  'medium',
  'medium-vertical',
  'large',
  'extra-large',
];

function BaseCardStory(args: ComponentProps<typeof BaseCard>) {
  return (
    <EntityCardStoryFrame size={args.size}>
      <BaseCard {...args} />
    </EntityCardStoryFrame>
  );
}

function BaseCardStoryContent({ compact = false }: { compact?: boolean }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return compact ? null : <div className={`h-full ${surface.textSecondary}`} />;
}

function BaseCardFooterControls() {
  const { theme } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <RoundControlButton theme={theme} size="small" variant="soft" aria-label="Day mode">
        <SunMedium className="h-3 w-3" />
      </RoundControlButton>
      <RoundControlButton theme={theme} size="small" variant="soft" aria-label="Night mode">
        <Moon className="h-3 w-3" />
      </RoundControlButton>
      <RoundControlButton theme={theme} size="small" variant="soft" aria-label="Scene mode">
        <Sparkles className="h-3 w-3" />
      </RoundControlButton>
    </div>
  );
}

function BaseCardAllSizes() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {SIZES.map((size) => (
        <div key={size} className="space-y-1">
          <p className="text-xs uppercase tracking-wide opacity-70">{size}</p>
          <EntityCardStoryFrame size={size}>
            <BaseCard
              size={size}
              title="BaseCard"
              subtitle="shared shell"
              headerLeading={
                <EntityCardHeaderIcon
                  IconComponent={Lightbulb}
                  isActive
                  size={size}
                  tone="primary"
                />
              }
              actionRow={{
                leftContent: size === 'tiny' ? undefined : <BaseCardFooterControls />,
              }}
              settingsAction={{ 'aria-label': 'Open settings' }}
            >
              <BaseCardStoryContent compact={size === 'tiny' || size === 'extra-small'} />
            </BaseCard>
          </EntityCardStoryFrame>
        </div>
      ))}
    </div>
  );
}

const meta = {
  title: 'Components/Primitives/Cards/BaseCard',
  component: BaseCardStory,
  tags: ['autodocs'],
  args: {
    size: 'medium',
    title: 'Kitchen scene',
    subtitle: 'Shared card shell',
    headerLeading: (
      <EntityCardHeaderIcon IconComponent={Lightbulb} isActive size="medium" tone="primary" />
    ),
    children: <BaseCardStoryContent />,
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: '',
      },
    },
  },
} satisfies Meta<typeof BaseCardStory>;

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

export const LightTheme: Story = {
  parameters: {
    globals: {
      theme: 'light',
    },
  },
};

export const TintedSurface: Story = {
  args: {
    backgroundClassName:
      'border-emerald-700/60 bg-linear-to-br from-emerald-900 via-emerald-900 to-teal-950',
    backgroundColor: '#064e3b',
    tone: 'primary',
  },
};

export const HeaderOnly: Story = {
  args: {
    size: 'small',
    children: null,
  },
};

export const ActionRowFooter: Story = {
  args: {
    actionRow: {
      leftContent: <BaseCardFooterControls />,
    },
    settingsAction: { 'aria-label': 'Open settings' },
  },
};

export const SettingsIconFooter: Story = {
  args: {
    footerMode: 'settings-icon',
    settingsAction: { 'aria-label': 'Open settings' },
  },
};

export const AllSizes: Story = {
  render: () => <BaseCardAllSizes />,
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
