import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@navet/app/hooks';
import { getStoryDocsDescription } from '@navet/app/storybook/story-docs';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { BaseCard } from './base-card';
import { CardShell } from './card-shell';

const meta = {
  title: 'Components/Primitives/CardShell',
  component: CardShell,
  parameters: { docs: { description: {} } },
  argTypes: {
    children: { control: 'text' },
    className: { control: 'text' },
  },
} satisfies Meta<typeof CardShell>;

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

type Story = StoryObj<typeof CardShell>;

function CardShellStory() {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div className="grid gap-4 p-4">
      <CardShell
        size="small"
        className={`${surface.panel} ${surface.border} border rounded-2xl p-4`}
      >
        <p className={`text-sm font-medium ${surface.textPrimary}`}>Kitchen window</p>
        <p className={`mt-1 text-xs ${surface.textMuted}`}>Small card shell</p>
      </CardShell>

      <CardShell
        size="medium"
        className={`${surface.panel} ${surface.border} border rounded-2xl p-4`}
      >
        <p className={`text-sm font-medium ${surface.textPrimary}`}>Living room climate</p>
        <p className={`mt-1 text-xs ${surface.textMuted}`}>21.5 °C · Heating to 22 °C</p>
      </CardShell>

      <CardShell
        size="large"
        className={`${surface.panel} ${surface.border} border rounded-2xl p-4`}
      >
        <p className={`text-sm font-medium ${surface.textPrimary}`}>Whole-home energy</p>
        <p className={`mt-1 text-xs ${surface.textMuted}`}>2.4 kW now · 18.7 kWh today</p>
      </CardShell>
    </div>
  );
}

export const Default: Story = {
  render: () => <CardShellStory />,
  parameters: {
    docs: {
      description: {
        story: 'Card shell composition at three dashboard sizes with realistic household content.',
      },
    },
  },
};

function CardShellWithBaseCardStory() {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div className="grid gap-4 p-4">
      <BaseCard
        size="small"
        frameClassName={`${surface.panel} ${surface.border} border rounded-2xl`}
      >
        <div className="p-4">
          <p className={`text-sm font-medium ${surface.textPrimary}`}>Reading corner</p>
          <p className={`mt-1 text-xs ${surface.textMuted}`}>BaseCard inside CardShell</p>
        </div>
      </BaseCard>
    </div>
  );
}

export const WithBaseCard: Story = {
  render: () => <CardShellWithBaseCardStory />,
  parameters: {
    docs: {
      description: {
        story: 'CardShell composed with BaseCard for a compact light control surface.',
      },
    },
  },
};
