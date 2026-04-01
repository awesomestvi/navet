import type { Meta, StoryObj } from '@storybook/react';
import { Plus, Wand2 } from 'lucide-react';
import type { ComponentProps } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { DashboardEmptyState } from '@/app/components/system/patterns';
import { useTheme } from '@/app/hooks';

function ThemeAwareDashboardEmptyState(
  props: Omit<ComponentProps<typeof DashboardEmptyState>, 'surface' | 'accentColor'>
) {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return <DashboardEmptyState {...props} surface={surface} accentColor={accentColor} />;
}

const meta = {
  title: 'Foundation/Patterns/Dashboard Empty State',
  component: ThemeAwareDashboardEmptyState,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Large dashboard-level empty-state pattern with optional action and compact mode. Intended for room or section shells that have no cards yet.',
      },
    },
  },
  args: {
    title: 'No cards in this room',
    description:
      'Start by adding a weather, media, or light card and arrange it exactly where you need it.',
    icon: Wand2,
    actionLabel: 'Add first card',
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
  },
};
