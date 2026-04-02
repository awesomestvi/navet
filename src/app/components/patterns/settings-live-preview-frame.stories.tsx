import type { Meta, StoryObj } from '@storybook/react';
import { Paintbrush } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useTheme } from '@/app/hooks';
import { InteractivePill } from '../primitives/interactive-pill';
import { SettingsLivePreviewFrame } from './settings-live-preview-frame';

function ThemeAwareSettingsLivePreviewFrame(
  props: Omit<ComponentProps<typeof SettingsLivePreviewFrame>, 'accentColor' | 'theme'>
) {
  const { theme, accentColor } = useTheme();

  return <SettingsLivePreviewFrame {...props} theme={theme} accentColor={accentColor} />;
}

const meta = {
  title: 'Components/Patterns/Settings Live Preview Frame',
  component: ThemeAwareSettingsLivePreviewFrame,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Reusable settings preview container that frames live controls with title, subtitle, and optional top-bar indicator in current theme context.',
      },
    },
  },
  args: {
    title: 'Theme appearance',
    subtitle: 'Preview how accent and surfaces look on real card chrome.',
  },
} satisfies Meta<typeof ThemeAwareSettingsLivePreviewFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {
  render: (args: ComponentProps<typeof ThemeAwareSettingsLivePreviewFrame>) => (
    <ThemeAwareSettingsLivePreviewFrame
      {...args}
      title={args.title ?? 'Theme appearance'}
      subtitle={args.subtitle ?? 'Preview how accent and surfaces look on real card chrome.'}
      topBar={
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-xs text-white/70">
          <Paintbrush className="h-3.5 w-3.5" />
          Accent
        </div>
      }
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <InteractivePill active intent="navigation">
          Glass
        </InteractivePill>
        <InteractivePill intent="navigation">Dark</InteractivePill>
        <InteractivePill intent="navigation">Light</InteractivePill>
        <InteractivePill intent="navigation">Black</InteractivePill>
      </div>
    </ThemeAwareSettingsLivePreviewFrame>
  ),
} as unknown as Story;
