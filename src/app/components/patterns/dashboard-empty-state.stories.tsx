import type { Meta, StoryObj } from '@storybook/react';
import { Plus, Sparkles, Wand2 } from 'lucide-react';
import type { ComponentProps } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import { DashboardEmptyState } from './dashboard-empty-state';
import { InlineEmptyState } from './inline-empty-state';

function ThemeAwareDashboardEmptyState(
  props: Omit<ComponentProps<typeof DashboardEmptyState>, 'surface' | 'accentColor'>
) {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return <DashboardEmptyState {...props} surface={surface} accentColor={accentColor} />;
}

function ThemeAwareInlineEmptyState(
  props: Omit<ComponentProps<typeof InlineEmptyState>, 'surface' | 'accentColor'>
) {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return <InlineEmptyState {...props} surface={surface} accentColor={accentColor} />;
}

const meta = {
  title: 'Components/Patterns/Empty State',
  component: ThemeAwareDashboardEmptyState,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Empty-state patterns for dashboard and panel surfaces. The default variant is full-size for page-level callouts; the Inline variant is compact for dense panels and card internals.',
      },
    },
  },
  args: {
    title: 'No dashboards configured',
    description:
      'Start with a focused room overview, then add widgets and cards as your setup grows.',
    icon: Sparkles,
    actionLabel: 'Create dashboard',
    actionIcon: Plus,
  },
  argTypes: {
    onAction: { action: 'action clicked' },
  },
} satisfies Meta<typeof ThemeAwareDashboardEmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Compact: Story = {
  args: {
    compact: true,
    icon: Wand2,
    title: 'Nothing pinned here yet',
    description: 'Pin a few high-signal cards to turn this into a quick control surface.',
    actionLabel: 'Pin cards',
  },
};

export const WithSupportingContent: Story = {
  args: {
    children: (
      <div className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/75">
        Suggestions use your current room and entity setup
      </div>
    ),
  },
};

export const Inline: Story = {
  render: () => (
    <ThemeAwareInlineEmptyState
      title="No scenes linked"
      description="Attach one or more scenes and trigger them from this compact action tile."
      icon={Wand2}
      actionLabel="Add scene"
      actionIcon={Plus}
    />
  ),
};

export const InlineWithCustomContent: Story = {
  render: () => (
    <ThemeAwareInlineEmptyState
      title="No scenes linked"
      description="Attach one or more scenes and trigger them from this compact action tile."
      icon={Wand2}
      actionLabel="Add scene"
      actionIcon={Plus}
    >
      <div className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/75">
        Last synced 2 minutes ago
      </div>
    </ThemeAwareInlineEmptyState>
  ),
};
