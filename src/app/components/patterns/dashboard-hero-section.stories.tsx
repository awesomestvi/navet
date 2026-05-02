import type { Meta, StoryObj } from '@storybook/react';
import { Sparkles } from 'lucide-react';
import { InteractivePill } from '@/app/components/primitives/interactive-pill';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import { DashboardHeroSection } from './dashboard-hero-section';

function DashboardHeroSectionStory() {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <DashboardHeroSection
      accentColor={accentColor}
      surface={surface}
      eyebrow={
        <div
          className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] ${surface.textMuted}`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>UI Kit</span>
        </div>
      }
      title="Shared hero chrome for dashboard and settings entry sections."
      description="Use the pattern instead of duplicating rounded bordered hero containers in feature modules."
      actions={
        <>
          <InteractivePill active intent="action">
            Explore patterns
          </InteractivePill>
          <InteractivePill intent="navigation">Compose with tokens</InteractivePill>
        </>
      }
    />
  );
}

const meta = {
  title: 'Components/Patterns/Dashboard Hero Section',
  component: DashboardHeroSectionStory,
  tags: ['autodocs'],
  render: () => <DashboardHeroSectionStory />,
} satisfies Meta<typeof DashboardHeroSectionStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <DashboardHeroSectionStory />,
};
