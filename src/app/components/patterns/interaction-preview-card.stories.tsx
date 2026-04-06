import type { Meta, StoryObj } from '@storybook/react';
import { Paintbrush } from 'lucide-react';
import type { ComponentProps } from 'react';
import { noopCardSizeChange } from '@/app/features/dashboard/stories/entity-card-story-frame';
import { LightCard } from '@/app/features/lighting';
import { useTheme } from '@/app/hooks';
import { getThemeSurfaceTokens } from '../shared/theme/theme-surface-tokens';
import { InteractionPreviewCard, SettingsLivePreviewFrame } from './interaction-preview-card';

function ThemeAwareInteractionPreviewCard({
  mode,
}: Omit<ComponentProps<typeof InteractionPreviewCard>, 'accentColor' | 'theme'>) {
  const { theme, accentColor } = useTheme();

  return <InteractionPreviewCard mode={mode} theme={theme} accentColor={accentColor} />;
}

function ThemeAwareSettingsLivePreviewFrame(
  props: Omit<ComponentProps<typeof SettingsLivePreviewFrame>, 'accentColor' | 'theme'>
) {
  const { theme, accentColor } = useTheme();

  return <SettingsLivePreviewFrame {...props} theme={theme} accentColor={accentColor} />;
}

function ThemeAwareAccentPill() {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${surface.textPrimary}`}
    >
      <Paintbrush className="h-3.5 w-3.5" />
      Accent
    </div>
  );
}

const meta = {
  title: 'Components/Patterns/Preview Cards',
  component: ThemeAwareInteractionPreviewCard,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Preview card patterns for settings surfaces, using the same visual language as real Navet cards.',
      },
    },
  },
  args: {
    mode: 'toggle-first',
  },
} satisfies Meta<typeof ThemeAwareInteractionPreviewCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ToggleFirst: Story = {};

export const ControlFirst: Story = {
  args: {
    mode: 'control-first',
  },
};

export const SettingsFrame: Story = {
  render: () => (
    <ThemeAwareSettingsLivePreviewFrame
      title="Theme appearance"
      subtitle="Compact live preview stage for a real card surface and ambient bleed."
      topBar={<ThemeAwareAccentPill />}
    >
      <LightCard
        id="light.preview"
        name="All ceiling lights"
        room="Living room"
        initialState
        initialBrightness={50}
        initialTemp={3200}
        size="small"
        isEditMode={false}
        onSizeChange={noopCardSizeChange}
      />
    </ThemeAwareSettingsLivePreviewFrame>
  ),
};

export const SmallCardPreview: Story = {
  render: () => (
    <div className="flex justify-center py-4">
      <div className="w-[190px]">
        <LightCard
          id="light.preview"
          name="All ceiling lights"
          room="Living room"
          initialState
          initialBrightness={50}
          initialTemp={3200}
          size="small"
          isEditMode={false}
          onSizeChange={noopCardSizeChange}
        />
      </div>
    </div>
  ),
};
