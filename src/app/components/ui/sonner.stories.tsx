import type { Meta, StoryObj } from '@storybook/react';
import { toast } from 'sonner';
import { InteractivePill } from '@/app/components/primitives/interactive-pill';
import { Panel } from '@/app/components/primitives/panel';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { Toaster } from './sonner';

function SonnerStory() {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div className="flex min-h-screen items-center justify-center p-12">
      <Toaster />
      <Panel className="w-full max-w-2xl p-6">
        <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${surface.textMuted}`}>
          Sonner toast
        </p>
        <h2 className={`mt-2 text-2xl font-semibold ${surface.textPrimary}`}>
          Navet toast preview
        </h2>
        <p className={`mt-2 max-w-xl text-sm ${surface.textSecondary}`}>
          Status toasts should feel like part of the dashboard shell rather than default browser UI.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <InteractivePill
            active
            intent="action"
            onClick={() => toast.success('Settings saved successfully')}
          >
            Success toast
          </InteractivePill>
          <InteractivePill
            intent="action"
            onClick={() =>
              toast.info('Home Assistant reconnected', {
                description: 'Live entity updates are flowing again.',
              })
            }
          >
            Info toast
          </InteractivePill>
          <InteractivePill
            intent="action"
            onClick={() =>
              toast.warning('Battery level is low', {
                description: 'Hallway motion sensor dropped below 15%.',
              })
            }
          >
            Warning toast
          </InteractivePill>
          <InteractivePill
            intent="action"
            onClick={() =>
              toast.error('Unable to connect to Home Assistant', {
                description: 'Check your token and Home Assistant URL, then try again.',
              })
            }
          >
            Error toast
          </InteractivePill>
          <InteractivePill
            intent="action"
            onClick={() =>
              toast('Update available', {
                description: 'Navet can reload now to install the latest dashboard update.',
                action: {
                  label: 'Reload',
                  onClick: () => undefined,
                },
                cancel: {
                  label: 'Later',
                  onClick: () => undefined,
                },
              })
            }
          >
            Action toast
          </InteractivePill>
          <InteractivePill intent="action" onClick={() => toast.loading('Syncing light state…')}>
            Loading toast
          </InteractivePill>
        </div>
      </Panel>
    </div>
  );
}

const meta = {
  title: 'Components/Primitives/Toast',
  component: SonnerStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          'Base toast system built on Sonner and themed for Navet surfaces.',
          '',
          'What this base story covers:',
          '- Success, info, warning, error, loading, and action toast variants.',
          '- Toast rendering against shared panel/text token behavior rather than browser-default affordances.',
          '',
          'Usage notes:',
          '- Keep toasts short and action-oriented; move long explanations to inline UI or dialogs.',
          '- Prefer a single clear action in action toasts and avoid stacking multiple competing CTAs.',
          '',
          'Review expectations:',
          '- Verify readability and hierarchy across all themes.',
          '- Verify status tone remains obvious without overwhelming surrounding chrome.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof SonnerStory>;

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

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
