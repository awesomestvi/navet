import { InteractivePill } from '@navet/app/components/primitives/interactive-pill';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@navet/app/hooks';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DashboardHeroSection } from './dashboard-hero-section';

function DashboardHeroSectionStory() {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <DashboardHeroSection
      accentColor={accentColor}
      surface={surface}
      title="Introductory chrome for setup and editing surfaces."
      description="Use only when a task needs orientation before live content. Operational dashboards should lead with current state."
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
