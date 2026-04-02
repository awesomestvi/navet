import type { Meta, StoryObj } from '@storybook/react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import { navetTypographyTokens } from './foundations';
import { ThemeTokenShowcase } from './theme-token-showcase';

const navetFontTokens = {
  body: 'font-sans',
  code: 'font-mono',
  fallback: 'system-ui, -apple-system, Segoe UI, sans-serif',
};

function FontsStory() {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <ThemeTokenShowcase
      intro="Font utility tokens used across Navet. `font-sans` is the default UI stack for controls, labels, and content. `font-mono` is reserved for identifiers, diagnostics, and machine-like values where alignment and precision matter."
      tokens={navetFontTokens}
      previewTitle="Reference usage"
      preview={
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className={`rounded-[24px] border p-5 ${surface.border} ${surface.panelMuted}`}>
            <p className={`${navetTypographyTokens.eyebrow} ${surface.textMuted}`}>font-sans</p>
            <h3 className={`mt-2 ${navetTypographyTokens.sectionHeading} ${surface.textPrimary}`}>
              Primary UI copy
            </h3>
            <p className={`mt-2 font-sans ${navetTypographyTokens.body} ${surface.textSecondary}`}>
              Use the sans stack for card labels, settings descriptions, dialog content, navigation,
              and most interactive UI text. This is the default reading voice of Navet.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className={`rounded-[20px] border p-4 ${surface.border} ${surface.panel}`}>
                <p className={`${navetTypographyTokens.label} ${surface.textPrimary}`}>
                  Dashboard controls
                </p>
                <p
                  className={`mt-2 font-sans ${navetTypographyTokens.body} ${surface.textSecondary}`}
                >
                  Whole-home overview, lighting presets, and room settings use the primary UI font.
                </p>
              </div>
              <div className={`rounded-[20px] border p-4 ${surface.border} ${surface.panel}`}>
                <p className={`${navetTypographyTokens.label} ${surface.textPrimary}`}>
                  Supporting copy
                </p>
                <p
                  className={`mt-2 font-sans ${navetTypographyTokens.helper} ${surface.textMuted}`}
                >
                  Connection help, empty-state guidance, and field hints stay in the same family for
                  consistency.
                </p>
              </div>
            </div>
          </section>

          <section className={`rounded-[24px] border p-5 ${surface.border} ${surface.panelMuted}`}>
            <p className={`${navetTypographyTokens.eyebrow} ${surface.textMuted}`}>font-mono</p>
            <h3 className={`mt-2 ${navetTypographyTokens.sectionHeading} ${surface.textPrimary}`}>
              Technical values
            </h3>
            <p className={`mt-2 ${navetTypographyTokens.body} ${surface.textSecondary}`}>
              Keep mono scoped to values that benefit from a more mechanical voice or easier visual
              scanning.
            </p>

            <div className={`mt-4 rounded-[20px] border p-4 ${surface.border} ${surface.panel}`}>
              <p className={`${navetTypographyTokens.label} ${surface.textPrimary}`}>
                Good mono examples
              </p>
              <div className="mt-3 space-y-2">
                <p className={`font-mono text-sm ${surface.textPrimary}`}>
                  sensor.living_room_power = 412.4W
                </p>
                <p className={`font-mono text-sm ${surface.textPrimary}`}>
                  light.kitchen_ceiling · 3900K · 64%
                </p>
                <p className={`font-mono text-sm ${surface.textPrimary}`}>
                  ws://homeassistant.local:8123/api/websocket
                </p>
              </div>
            </div>

            <p className={`mt-4 ${navetTypographyTokens.helper} ${surface.textMuted}`}>
              Avoid mono for general UI copy, settings labels, or long descriptive text.
            </p>
          </section>
        </div>
      }
    />
  );
}

const meta = {
  title: 'Theme/Fonts',
  component: FontsStory,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          'Typography family guidance for primary UI copy (`font-sans`) and technical values (`font-mono`).',
          '',
          'What this page covers:',
          '- Default reading voice and layout text behavior using the sans stack.',
          '- Focused mono usage for identifiers, diagnostics, and machine-like values.',
          '',
          'Usage notes:',
          '- Keep labels, settings copy, and navigational text in sans for consistency.',
          '- Reserve mono for values where alignment and scanning speed matter.',
          '',
          'Review expectations:',
          '- Confirm sans remains legible at helper/body/heading sizes.',
          '- Confirm mono remains readable without overpowering surrounding UI copy.',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof FontsStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
