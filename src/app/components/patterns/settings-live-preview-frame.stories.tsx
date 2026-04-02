import type { Meta, StoryObj } from '@storybook/react';
import { Paintbrush } from 'lucide-react';
import { noopCardSizeChange } from '@/app/features/dashboard/stories/entity-card-story-frame';
import { LightCard } from '@/app/features/lighting';
import { useTheme } from '@/app/hooks';
import { getThemeSurfaceTokens } from '../shared/theme/theme-surface-tokens';
import { SettingsLivePreviewFrame } from './settings-live-preview-frame';

function ThemeAwareSettingsLivePreviewFrame(
  props: Omit<React.ComponentProps<typeof SettingsLivePreviewFrame>, 'accentColor' | 'theme'>
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
  component: ThemeAwareSettingsLivePreviewFrame,
  tags: ['autodocs'],
  args: {
    title: 'Theme appearance',
    subtitle: 'Compact live preview stage for a real card surface and ambient bleed.',
    topBar: <ThemeAwareAccentPill />,
    children: (
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
    ),
  },
} satisfies Meta<typeof ThemeAwareSettingsLivePreviewFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

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
