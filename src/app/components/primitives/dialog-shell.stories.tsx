import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
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
        <h2 className={`text-lg font-semibold ${surface.textPrimary}`}>Device editor</h2>
        <p className={`mt-2 text-sm ${surface.textSecondary}`}>
          Shared shell primitive for settings and custom-card dialogs.
        </p>
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
        <h2 className={`text-lg font-semibold ${surface.textPrimary}`}>Theme decoration</h2>
        <p className={`mt-2 text-sm ${surface.textSecondary}`}>
          Optional glow and overlay decoration layers are rendered by the shell.
        </p>
        <DialogFooter>
          <DialogDoneButton
            label="Close"
            className={`rounded-xl border px-4 py-2 text-sm font-medium ${surface.border} ${surface.textPrimary} ${surface.hoverBg}`}
          />
        </DialogFooter>
      </DialogShell>
    </div>
  );
}

const meta = {
  title: 'Components/Primitives/Dialog Shell',
  component: DialogShell,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Radix-based shell for settings-style dialogs with optional glow and overlay decoration layers. Use this to keep modal structure and effects consistent.',
      },
    },
  },
} satisfies Meta<typeof DialogShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Basic = {
  render: () => <BasicDialogStory />,
} as unknown as Story;

export const Decorated = {
  render: () => <DecoratedDialogStory />,
} as unknown as Story;
