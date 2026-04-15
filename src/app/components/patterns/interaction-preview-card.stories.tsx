import type { Meta, StoryObj } from '@storybook/react';
import { Paintbrush } from 'lucide-react';
import type { ComponentProps } from 'react';
import { LightCard } from '@/app/features/lighting';
import { useTheme } from '@/app/hooks';
import { noopCardSizeChange } from '@/app/storybook/story-frames';
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
        component: [
          'Preview-card patterns for settings surfaces, built to mirror production card language without embedding full settings screens.',
          '',
          'What this page covers:',
          '- Interaction preview arrangements (`toggle-first`, `control-first`) to compare information hierarchy.',
          '- A compact settings frame shell for live previews with top-bar controls and realistic card chrome.',
          '- Isolated small-card staging for spacing and proportion checks.',
          '',
          'Usage notes:',
          '- Use these patterns in settings and onboarding contexts where users need immediate visual feedback.',
          '- Keep preview cards structurally close to real cards so behavior and styling do not drift.',
          '',
          'Review expectations:',
          '- Verify control emphasis and scan order remain clear in both interaction modes.',
          '- Verify small-card previews preserve legibility and touch targets.',
        ].join('\n'),
      },
    },
  },
  args: {
    mode: 'toggle-first',
  },
} satisfies Meta<typeof ThemeAwareInteractionPreviewCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ToggleFirst: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Interaction preview layout where the primary toggle and supporting details are presented in a top-first arrangement.',
      },
    },
  },
};

export const ControlFirst: Story = {
  args: {
    mode: 'control-first',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Interaction preview layout where the main control is visually prioritized and toggle metadata is secondary.',
      },
    },
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
  parameters: {
    docs: {
      description: {
        story:
          'Compact settings live preview frame showing a realistic card surface with contextual top-bar content.',
      },
    },
  },
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
  parameters: {
    docs: {
      description: {
        story:
          'Minimal stage for inspecting small card proportions and spacing in isolation from surrounding settings chrome.',
      },
    },
  },
};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
