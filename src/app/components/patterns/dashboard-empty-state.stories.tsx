import type { Meta, StoryObj } from '@storybook/react';
import { Clipboard, Lightbulb, Plus, Sparkles, Wand2 } from 'lucide-react';
import type { ComponentProps } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import { DashboardEmptyState } from './dashboard-empty-state';

function ThemeAwareDashboardEmptyState(
  props: Omit<ComponentProps<typeof DashboardEmptyState>, 'surface' | 'accentColor'>
) {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return <DashboardEmptyState {...props} surface={surface} accentColor={accentColor} />;
}

function ThemeAwareInlineEmptyState(
  props: Omit<ComponentProps<typeof DashboardEmptyState>, 'surface' | 'accentColor'>
) {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <DashboardEmptyState {...props} surface={surface} accentColor={accentColor} variant="inline" />
  );
}

function SectionEmptyStatesPreview() {
  const { t } = useI18n();

  return (
    <div className="space-y-8 p-8">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-white/80">Tasks Section</h3>
        <ThemeAwareDashboardEmptyState
          icon={Clipboard}
          title={t('sections.tasks.emptyTitle')}
          description={t('sections.tasks.emptyDescription')}
          className="w-full max-w-md"
        />
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold text-white/80">Lights Section</h3>
        <ThemeAwareDashboardEmptyState
          icon={Lightbulb}
          title={t('sections.lights.emptyTitle')}
          description={t('sections.lights.emptyDescription')}
          className="w-full max-w-md"
        />
      </div>
    </div>
  );
}

const meta = {
  title: 'Components/Patterns/Empty State',
  component: ThemeAwareDashboardEmptyState,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'Shared empty-state pattern family for dashboard and panel surfaces, spanning page-level callouts and compact inline states.',
          '',
          'What this page covers:',
          '- Full-size default and compact variants for section-level fallback states.',
          '- Inline variants for dense card internals and utility panel contexts.',
          '- Supporting-content slot usage for contextual hints and freshness/status cues.',
          '- Section-level app examples that consume shared translations.',
          '',
          'Usage notes:',
          '- Prefer this pattern over feature-specific empty-state markup to keep hierarchy and action language consistent.',
          '- Reserve custom children for concise, high-signal helper content.',
          '',
          'Review expectations:',
          '- Verify icon/title/description balance remains readable at all sizes.',
          '- Verify inline variants remain informative without overwhelming compact layouts.',
        ].join('\n'),
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

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Primary page-level empty state with icon, explanatory copy, and optional action.',
      },
    },
  },
};

export const Compact: Story = {
  args: {
    compact: true,
    icon: Wand2,
    title: 'Nothing pinned here yet',
    description: 'Pin a few high-signal cards to turn this into a quick control surface.',
    actionLabel: 'Pin cards',
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact variant for tighter sections that still need a clear action prompt.',
      },
    },
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
  parameters: {
    docs: {
      description: {
        story:
          'Default empty state with additional inline supporting content below the primary message.',
      },
    },
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
  parameters: {
    docs: {
      description: {
        story:
          'Inline variant for card internals and dense panel areas where vertical space is limited.',
      },
    },
  },
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
  parameters: {
    docs: {
      description: {
        story: 'Inline variant extended with custom status content in the supporting slot.',
      },
    },
  },
};

export const AppSectionExamples: Story = {
  render: () => <SectionEmptyStatesPreview />,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story:
          'Examples of how the shared empty-state pattern is used inside the app-shell sections, so section-level empty states live alongside the base pattern documentation.',
      },
    },
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
