import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import { getStoryDocsDescription } from '@/app/storybook/story-docs';
import { Button } from './button';
import {
  DialogDoneButton,
  DialogFooter,
  DialogShell,
  settingsDialogContentClass,
} from './dialog-shell';

function BasicDialogStory() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`rounded-xl border px-4 py-2 text-sm font-medium ${surface.border} ${surface.textPrimary} ${surface.hoverBg}`}
      >
        Open dialog
      </button>
      <DialogShell
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        overlayClassName="bg-black/55 backdrop-blur-sm"
        contentClassName={settingsDialogContentClass(surface, { padding: true, animate: true })}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}>
              Header
            </p>
            <div>
              <h2 className={`text-lg font-semibold ${surface.textPrimary}`}>Device editor</h2>
              <p className={`mt-2 text-sm ${surface.textSecondary}`}>
                Shared shell primitive for settings and custom-card dialogs.
              </p>
            </div>
          </div>

          <div className={`rounded-2xl border p-4 ${surface.border} ${surface.panelMuted}`}>
            <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}>
              Body
            </p>
            <div className="mt-3 grid gap-3">
              <div className={`rounded-xl border p-3 ${surface.border} ${surface.subtleBg}`}>
                <p className={`text-sm font-medium ${surface.textPrimary}`}>Display name</p>
                <p className={`mt-1 text-sm ${surface.textSecondary}`}>Kitchen Accent Light</p>
              </div>
              <div className={`rounded-xl border p-3 ${surface.border} ${surface.subtleBg}`}>
                <p className={`text-sm font-medium ${surface.textPrimary}`}>Room</p>
                <p className={`mt-1 text-sm ${surface.textSecondary}`}>Kitchen</p>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogDoneButton
            label="Done"
            className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          />
        </DialogFooter>
      </DialogShell>
    </div>
  );
}

function DecoratedDialogStory() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`rounded-xl border px-4 py-2 text-sm font-medium ${surface.border} ${surface.textPrimary} ${surface.hoverBg}`}
      >
        Open decorated dialog
      </button>
      <DialogShell
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        overlayClassName="bg-black/60 backdrop-blur-md"
        contentClassName={settingsDialogContentClass(surface, {
          padding: true,
          maxWidth: 'sm',
          animate: true,
        })}
        contentGlowClassName="pointer-events-none opacity-90"
        contentGlowStyle={{
          background: `radial-gradient(circle at top, ${accentColor}33, transparent 58%)`,
        }}
        contentOverlayClassName="bg-white/[0.01]"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}>
              Decorated shell
            </p>
            <div>
              <h2 className={`text-lg font-semibold ${surface.textPrimary}`}>Theme decoration</h2>
              <p className={`mt-2 text-sm ${surface.textSecondary}`}>
                Optional glow and overlay layers are rendered by the shell, while the content stays
                readable above them.
              </p>
            </div>
          </div>

          <div className={`rounded-2xl border p-4 ${surface.border} ${surface.panelMuted}`}>
            <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}>
              Layout helper example
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-3 py-1.5 text-xs ${surface.border} ${surface.textSecondary}`}
              >
                maxWidth: sm
              </span>
              <span
                className={`rounded-full border px-3 py-1.5 text-xs ${surface.border} ${surface.textSecondary}`}
              >
                padding: true
              </span>
              <span
                className={`rounded-full border px-3 py-1.5 text-xs ${surface.border} ${surface.textSecondary}`}
              >
                animate: true
              </span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="medium" className={`${surface.textSecondary}`}>
              Secondary action
            </Button>
            <DialogDoneButton
              label="Close"
              className={`rounded-xl border px-4 py-2 text-sm font-medium ${surface.border} ${surface.textPrimary} ${surface.hoverBg}`}
            />
          </div>
        </DialogFooter>
      </DialogShell>
    </div>
  );
}

const meta = {
  title: 'Components/Primitives/Dialog Shell',
  component: DialogShell,
  tags: ['autodocs'],
  render: () => <BasicDialogStory />,
  parameters: {
    docs: {
      description: {
        component:
          'Radix-based shell for settings-style dialogs with optional glow and overlay decoration layers. Use this to keep modal structure and effects consistent.',
      },
    },
  },
} satisfies Meta<typeof DialogShell>;

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

export const Basic = {
  render: () => <BasicDialogStory />,
} as unknown as Story;

export const Decorated = {
  render: () => <DecoratedDialogStory />,
} as unknown as Story;
