import type { Meta, StoryObj } from '@storybook/react';
import { Plus, Wand2 } from 'lucide-react';
import type { ComponentProps } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { InlineEmptyState } from '@/app/components/system/primitives';
import { useTheme } from '@/app/hooks';

function ThemeAwareInlineEmptyState(
  props: Omit<ComponentProps<typeof InlineEmptyState>, 'surface' | 'accentColor'>
) {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return <InlineEmptyState {...props} surface={surface} accentColor={accentColor} />;
}

const meta = {
  title: 'Primitives/Inline Empty State',
  component: ThemeAwareInlineEmptyState,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Compact empty-state primitive for dense panels and card internals. Supports optional action and extra child content for contextual hints.',
      },
    },
  },
  args: {
    title: 'No scenes linked',
    description: 'Attach one or more scenes and trigger them from this compact action tile.',
    icon: Wand2,
    actionLabel: 'Add scene',
    actionIcon: Plus,
  },
  argTypes: {
    onAction: { action: 'action clicked' },
  },
} satisfies Meta<typeof ThemeAwareInlineEmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithCustomContent: Story = {
  args: {
    children: (
      <div className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs text-white/75">
        Last synced 2 minutes ago
      </div>
    ),
  },
};
