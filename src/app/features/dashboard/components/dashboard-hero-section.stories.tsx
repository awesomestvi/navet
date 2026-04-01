import type { Meta, StoryObj } from '@storybook/react';
import { Sparkles } from 'lucide-react';
import type { ComponentProps } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { DashboardHeroSection } from '@/app/components/system/patterns';
import { InteractivePill } from '@/app/components/system/primitives';
import { useTheme } from '@/app/hooks';

function DefaultHeroStory() {
  const { theme } = useTheme();
  const asideItemClassName =
    theme === 'light'
      ? 'bg-black/5 text-gray-700'
      : theme === 'contrast'
        ? 'bg-white/8 text-white'
        : 'bg-white/6 text-white/80';

  return (
    <ThemeAwareDashboardHeroSection
      eyebrow={
        <>
          <Sparkles className="h-3.5 w-3.5" />
          <span>Storybook</span>
        </>
      }
      title="Build Navet UI in isolation before it lands in a feature."
      description="Use the system layer to document primitives, validate themes, and keep new UI work consistent across onboarding, settings, and dashboard surfaces."
      actions={
        <>
          <InteractivePill active intent="action">
            Explore primitives
          </InteractivePill>
          <InteractivePill intent="navigation">Review patterns</InteractivePill>
        </>
      }
      aside={
        <>
          <div className={`rounded-2xl px-3 py-2 text-sm backdrop-blur-xl ${asideItemClassName}`}>
            Pills and controls
          </div>
          <div className={`rounded-2xl px-3 py-2 text-sm backdrop-blur-xl ${asideItemClassName}`}>
            Empty states and heroes
          </div>
          <div className={`rounded-2xl px-3 py-2 text-sm backdrop-blur-xl ${asideItemClassName}`}>
            Theme surface tokens
          </div>
        </>
      }
    />
  );
}

function ThemeAwareDashboardHeroSection({
  eyebrow,
  title,
  description,
  actions,
  aside,
}: Omit<ComponentProps<typeof DashboardHeroSection>, 'accentColor' | 'surface'>) {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const eyebrowClassName =
    theme === 'light' ? 'text-gray-500' : theme === 'contrast' ? 'text-white/70' : 'text-white/60';
  const asideSurfaceClassName =
    theme === 'light'
      ? 'border-gray-200/80 bg-white/90 text-gray-900'
      : theme === 'contrast'
        ? 'border-white/14 bg-black text-white'
        : 'border-white/10 bg-white/6 text-white';
  const asideTextClassName = theme === 'light' ? 'text-gray-600' : 'text-white/65';
  return (
    <DashboardHeroSection
      eyebrow={
        eyebrow ? (
          <div
            className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] ${eyebrowClassName}`}
          >
            {eyebrow}
          </div>
        ) : null
      }
      title={title}
      description={description}
      actions={actions}
      accentColor={accentColor}
      surface={surface}
      aside={
        aside ? (
          <div className={`rounded-3xl border p-4 backdrop-blur-xl ${asideSurfaceClassName}`}>
            <p
              className={`text-xs font-semibold uppercase tracking-[0.22em] ${asideTextClassName}`}
            >
              First wave
            </p>
            <div className="mt-3 grid gap-2">{aside}</div>
          </div>
        ) : null
      }
    />
  );
}

const meta = {
  title: 'Foundation/Patterns/Dashboard Hero Section',
  component: ThemeAwareDashboardHeroSection,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Composed hero pattern for dashboard and section intros. Supports eyebrow, action slot, and aside content with shared theme-surface tokens.',
      },
    },
  },
} satisfies Meta<typeof ThemeAwareDashboardHeroSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {
  render: () => <DefaultHeroStory />,
} as unknown as Story;
