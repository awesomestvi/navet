import type { Meta, StoryObj } from '@storybook/react';
import { Plus, Wand2 } from 'lucide-react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import { InlineEmptyState } from './inline-empty-state';

function ThemeAwareInlineEmptyState(
  props: Omit<React.ComponentProps<typeof InlineEmptyState>, 'surface' | 'accentColor'>
) {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return <InlineEmptyState {...props} surface={surface} accentColor={accentColor} />;
}

const meta = {
  title: 'Components/Patterns/Inline Empty State',
  component: ThemeAwareInlineEmptyState,
  tags: ['autodocs'],
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
