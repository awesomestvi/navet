import { Button, IconButton, Input, Panel, SurfacePanel } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@navet/app/hooks/use-theme';
import type { Meta, StoryObj } from '@storybook/react';
import { Search, Settings2 } from 'lucide-react';
import { navetControlTokens, navetDensityTokens, navetLayoutTokens } from './index';
import { ThemeTokenShowcase } from './theme-token-showcase';

function ControlsPreview() {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <SurfacePanel padding="lg" withSheen>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${surface.textMuted}`}>
            {theme} theme
          </p>
          <h3 className={`mt-2 text-lg font-semibold ${surface.textPrimary}`}>
            Shared control family
          </h3>
          <p className={`mt-1 text-sm leading-6 ${surface.textSecondary}`}>
            These are the real Navet primitives. Use the toolbar to review every theme.
          </p>
        </div>
        <IconButton
          label="Control settings"
          icon={<Settings2 className="h-4 w-4" />}
          size="small"
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${surface.textMuted}`}>
              Actions
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Button>Save changes</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Cancel</Button>
              <Button size="touch" variant="soft">
                Touch-forward
              </Button>
            </div>
          </div>

          <div>
            <label
              htmlFor="controls-story-search"
              className={`text-xs font-semibold uppercase tracking-[0.16em] ${surface.textMuted}`}
            >
              Search field
            </label>
            <Input
              id="controls-story-search"
              containerClassName="mt-3"
              placeholder="Search devices"
              leading={<Search className="h-4 w-4" />}
            />
          </div>
        </div>

        <Panel muted className="space-y-4">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${surface.textMuted}`}>
              Dialog
            </p>
            <h4 className={`mt-2 text-base font-semibold ${surface.textPrimary}`}>
              Settings shell
            </h4>
            <p className={`mt-2 text-sm leading-6 ${surface.textSecondary}`}>
              Shared controls keep the same action hierarchy inside Navet’s dialog surfaces.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="ghost" size="small">
              Cancel
            </Button>
            <Button size="small">Done</Button>
          </div>
        </Panel>
      </div>
    </SurfacePanel>
  );
}

function ControlsStory() {
  return (
    <ThemeTokenShowcase
      intro="Semantic control tokens define Navet’s 36 px compact minimum, 40 px standard, and exceptional 42 px control tier across buttons, fields, icon actions, panels, and dialogs. Use these primitives before introducing feature-local control styles."
      tokens={{
        density: navetDensityTokens,
        controls: navetControlTokens,
        layout: navetLayoutTokens,
      }}
      previewTitle="Live Navet controls"
      preview={<ControlsPreview />}
    />
  );
}

const meta = {
  title: 'Theme/Controls',
  component: ControlsStory,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'Shared semantic control and layout tokens used by Navet’s canonical primitives.',
          '',
          'What this story proves:',
          '- The shared 36 / 40 / 42 px interaction scale for compact, standard, and exceptional touch-forward UI.',
          '- Shared button, input, card, and dialog sizing decisions.',
          '- Canonical Navet primitives rendered through the active Storybook theme.',
          '',
          'Use this story when:',
          '- Keep color resolution in the existing theme helpers; these tokens only define shared sizing and structure.',
          '- Prefer tokenized control dimensions before introducing inline component-specific values.',
          '',
          'Review before merging:',
          '- Verify controls stay within the 36 / 40 / 42 px scale across compact, comfortable, and touch-oriented tiers.',
          '- Use the Storybook toolbar to verify button, input, card, and dialog surfaces in glass, dark, light, and black themes.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof ControlsStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
