import type { Meta, StoryObj } from '@storybook/react';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ColorInputSwatch, Input } from '@/app/components/primitives';
import { themeColorValues } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { generateThemeColors, type ThemeType, useTheme } from '@/app/hooks/use-theme';
import { navetSemanticColorTokens, navetTypographyTokens } from './foundations';

const THEME_COLUMNS: ThemeType[] = ['light', 'dark', 'glass', 'black'];

type TokenKind = 'hex' | 'semantic' | 'surface' | 'border' | 'text' | 'gradient';

type TokenRow = {
  token: string;
  meaning: string;
  kind: TokenKind;
  values: Record<ThemeType, string>;
};

function repeatAcrossThemes(value: string): Record<ThemeType, string> {
  return {
    light: value,
    dark: value,
    glass: value,
    black: value,
  };
}

function AccentSwatch({ name, value }: { name: string; value: string }) {
  return (
    <article className="text-center">
      <div className="flex justify-center">
        <ColorInputSwatch
          value={value}
          ariaLabel={`${name} accent`}
          title={`${name} accent`}
          mode="swatch"
          size="large"
          className="shadow-[0_10px_20px_-16px_rgba(0,0,0,0.28)]"
        />
      </div>
      <div className="mt-3">
        <p className={`${navetTypographyTokens.label} text-white capitalize`}>{name}</p>
        <p className={`mt-0.5 font-mono ${navetTypographyTokens.caption} text-white/58`}>{value}</p>
      </div>
    </article>
  );
}

function TokenCell({
  kind,
  themeMode,
  value,
}: {
  kind: TokenKind;
  themeMode: ThemeType;
  value: string;
}) {
  const themeSurface = getThemeSurfaceTokens(themeMode);

  return (
    <div className="space-y-2">
      {kind === 'hex' ? (
        <div
          className="h-14 rounded-[16px] border"
          style={{ backgroundColor: value, borderColor: `${value}55` }}
        />
      ) : kind === 'semantic' ? (
        <div
          className={`flex h-14 items-center rounded-[16px] border px-3 text-xs font-medium ${value}`}
        >
          Sample
        </div>
      ) : kind === 'text' ? (
        <div
          className={`flex h-14 items-center rounded-[16px] border px-3 ${themeSurface.border} ${themeSurface.panelMuted}`}
        >
          <span className={`${value} text-sm font-semibold`}>Aa</span>
        </div>
      ) : kind === 'border' ? (
        <div className={`h-14 rounded-[16px] border-2 ${themeSurface.panelMuted} ${value}`} />
      ) : kind === 'surface' ? (
        <div className={`h-14 rounded-[16px] border ${themeSurface.border} ${value}`} />
      ) : (
        <div
          className={`h-14 rounded-[16px] border ${themeSurface.border} bg-gradient-to-br ${value}`}
        />
      )}

      <code className="block break-all text-[11px] leading-5 text-white/58">{value}</code>
    </div>
  );
}

function ColorsStory() {
  const { theme, primaryColor, customPrimaryColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const [query, setQuery] = useState('');

  const themeColorMatrix = useMemo(
    () =>
      Object.fromEntries(
        THEME_COLUMNS.map((themeMode) => [
          themeMode,
          {
            colors: generateThemeColors(themeMode, primaryColor, customPrimaryColor),
            surface: getThemeSurfaceTokens(themeMode),
          },
        ])
      ) as Record<
        ThemeType,
        {
          colors: ReturnType<typeof generateThemeColors>;
          surface: ReturnType<typeof getThemeSurfaceTokens>;
        }
      >,
    [customPrimaryColor, primaryColor]
  );

  const tokenRows = useMemo<TokenRow[]>(
    () => [
      ...Object.entries(themeColorValues).map(([name, value]) => ({
        token: `themeColorValues.${name}`,
        meaning: 'Preset accent swatch used by the theme picker',
        kind: 'hex' as const,
        values: repeatAcrossThemes(value),
      })),
      {
        token: 'navetSemanticColorTokens.info',
        meaning: 'Informational feedback and neutral status messaging',
        kind: 'semantic',
        values: repeatAcrossThemes(navetSemanticColorTokens.info),
      },
      {
        token: 'navetSemanticColorTokens.success',
        meaning: 'Positive confirmations and successful completion states',
        kind: 'semantic',
        values: repeatAcrossThemes(navetSemanticColorTokens.success),
      },
      {
        token: 'navetSemanticColorTokens.warning',
        meaning: 'Cautionary messaging and degraded but recoverable states',
        kind: 'semantic',
        values: repeatAcrossThemes(navetSemanticColorTokens.warning),
      },
      {
        token: 'navetSemanticColorTokens.error',
        meaning: 'Blocking failures, destructive states, and broken connections',
        kind: 'semantic',
        values: repeatAcrossThemes(navetSemanticColorTokens.error),
      },
      {
        token: 'surface.textPrimary',
        meaning: 'Highest emphasis text on panels and dialogs',
        kind: 'text',
        values: {
          light: themeColorMatrix.light.surface.textPrimary,
          dark: themeColorMatrix.dark.surface.textPrimary,
          glass: themeColorMatrix.glass.surface.textPrimary,
          black: themeColorMatrix.black.surface.textPrimary,
        },
      },
      {
        token: 'surface.textSecondary',
        meaning: 'Secondary body copy and supporting labels',
        kind: 'text',
        values: {
          light: themeColorMatrix.light.surface.textSecondary,
          dark: themeColorMatrix.dark.surface.textSecondary,
          glass: themeColorMatrix.glass.surface.textSecondary,
          black: themeColorMatrix.black.surface.textSecondary,
        },
      },
      {
        token: 'surface.textMuted',
        meaning: 'Eyebrows, helper text, and low-emphasis metadata',
        kind: 'text',
        values: {
          light: themeColorMatrix.light.surface.textMuted,
          dark: themeColorMatrix.dark.surface.textMuted,
          glass: themeColorMatrix.glass.surface.textMuted,
          black: themeColorMatrix.black.surface.textMuted,
        },
      },
      {
        token: 'surface.panel',
        meaning: 'Primary shared panel fill for cards and shells',
        kind: 'surface',
        values: {
          light: themeColorMatrix.light.surface.panel,
          dark: themeColorMatrix.dark.surface.panel,
          glass: themeColorMatrix.glass.surface.panel,
          black: themeColorMatrix.black.surface.panel,
        },
      },
      {
        token: 'surface.panelMuted',
        meaning: 'Inset and quieter supporting surfaces inside panels',
        kind: 'surface',
        values: {
          light: themeColorMatrix.light.surface.panelMuted,
          dark: themeColorMatrix.dark.surface.panelMuted,
          glass: themeColorMatrix.glass.surface.panelMuted,
          black: themeColorMatrix.black.surface.panelMuted,
        },
      },
      {
        token: 'surface.iconBg',
        meaning: 'Icon well fill behind compact actions and badges',
        kind: 'surface',
        values: {
          light: themeColorMatrix.light.surface.iconBg,
          dark: themeColorMatrix.dark.surface.iconBg,
          glass: themeColorMatrix.glass.surface.iconBg,
          black: themeColorMatrix.black.surface.iconBg,
        },
      },
      {
        token: 'surface.subtleBg',
        meaning: 'Soft fills for muted rows, pills, and lightweight containers',
        kind: 'surface',
        values: {
          light: themeColorMatrix.light.surface.subtleBg,
          dark: themeColorMatrix.dark.surface.subtleBg,
          glass: themeColorMatrix.glass.surface.subtleBg,
          black: themeColorMatrix.black.surface.subtleBg,
        },
      },
      {
        token: 'surface.border',
        meaning: 'Default shared border color for cards and controls',
        kind: 'border',
        values: {
          light: themeColorMatrix.light.surface.border,
          dark: themeColorMatrix.dark.surface.border,
          glass: themeColorMatrix.glass.surface.border,
          black: themeColorMatrix.black.surface.border,
        },
      },
      {
        token: 'colors.light.gradient',
        meaning: 'Active lighting card background family',
        kind: 'gradient',
        values: {
          light: themeColorMatrix.light.colors.light.gradient,
          dark: themeColorMatrix.dark.colors.light.gradient,
          glass: themeColorMatrix.glass.colors.light.gradient,
          black: themeColorMatrix.black.colors.light.gradient,
        },
      },
      {
        token: 'colors.media.gradient',
        meaning: 'Media card hero background family',
        kind: 'gradient',
        values: {
          light: themeColorMatrix.light.colors.media.gradient,
          dark: themeColorMatrix.dark.colors.media.gradient,
          glass: themeColorMatrix.glass.colors.media.gradient,
          black: themeColorMatrix.black.colors.media.gradient,
        },
      },
      {
        token: 'colors.lock.locked.gradient',
        meaning: 'Locked-state background for security surfaces',
        kind: 'gradient',
        values: {
          light: themeColorMatrix.light.colors.lock.locked.gradient,
          dark: themeColorMatrix.dark.colors.lock.locked.gradient,
          glass: themeColorMatrix.glass.colors.lock.locked.gradient,
          black: themeColorMatrix.black.colors.lock.locked.gradient,
        },
      },
      {
        token: 'colors.lock.unlocked.gradient',
        meaning: 'Unlocked-state warning background for security surfaces',
        kind: 'gradient',
        values: {
          light: themeColorMatrix.light.colors.lock.unlocked.gradient,
          dark: themeColorMatrix.dark.colors.lock.unlocked.gradient,
          glass: themeColorMatrix.glass.colors.lock.unlocked.gradient,
          black: themeColorMatrix.black.colors.lock.unlocked.gradient,
        },
      },
      {
        token: 'colors.cover.open.gradient',
        meaning: 'Open-state background for covers, blinds, and shades',
        kind: 'gradient',
        values: {
          light: themeColorMatrix.light.colors.cover.open.gradient,
          dark: themeColorMatrix.dark.colors.cover.open.gradient,
          glass: themeColorMatrix.glass.colors.cover.open.gradient,
          black: themeColorMatrix.black.colors.cover.open.gradient,
        },
      },
      {
        token: 'colors.hvac.heating.gradient',
        meaning: 'Heating mode background family',
        kind: 'gradient',
        values: {
          light: themeColorMatrix.light.colors.hvac.heating.gradient,
          dark: themeColorMatrix.dark.colors.hvac.heating.gradient,
          glass: themeColorMatrix.glass.colors.hvac.heating.gradient,
          black: themeColorMatrix.black.colors.hvac.heating.gradient,
        },
      },
      {
        token: 'colors.hvac.cooling.gradient',
        meaning: 'Cooling mode background family',
        kind: 'gradient',
        values: {
          light: themeColorMatrix.light.colors.hvac.cooling.gradient,
          dark: themeColorMatrix.dark.colors.hvac.cooling.gradient,
          glass: themeColorMatrix.glass.colors.hvac.cooling.gradient,
          black: themeColorMatrix.black.colors.hvac.cooling.gradient,
        },
      },
      {
        token: 'colors.person.home.gradient',
        meaning: 'Presence-at-home color family',
        kind: 'gradient',
        values: {
          light: themeColorMatrix.light.colors.person.home.gradient,
          dark: themeColorMatrix.dark.colors.person.home.gradient,
          glass: themeColorMatrix.glass.colors.person.home.gradient,
          black: themeColorMatrix.black.colors.person.home.gradient,
        },
      },
      {
        token: 'colors.vacuum.cleaning.gradient',
        meaning: 'Vacuum cleaning state background family',
        kind: 'gradient',
        values: {
          light: themeColorMatrix.light.colors.vacuum.cleaning.gradient,
          dark: themeColorMatrix.dark.colors.vacuum.cleaning.gradient,
          glass: themeColorMatrix.glass.colors.vacuum.cleaning.gradient,
          black: themeColorMatrix.black.colors.vacuum.cleaning.gradient,
        },
      },
      {
        token: 'colors.rss.gradient',
        meaning: 'Editorial/feed-style background family',
        kind: 'gradient',
        values: {
          light: themeColorMatrix.light.colors.rss.gradient,
          dark: themeColorMatrix.dark.colors.rss.gradient,
          glass: themeColorMatrix.glass.colors.rss.gradient,
          black: themeColorMatrix.black.colors.rss.gradient,
        },
      },
      {
        token: 'colors.calendar.gradient',
        meaning: 'Calendar and planning background family',
        kind: 'gradient',
        values: {
          light: themeColorMatrix.light.colors.calendar.gradient,
          dark: themeColorMatrix.dark.colors.calendar.gradient,
          glass: themeColorMatrix.glass.colors.calendar.gradient,
          black: themeColorMatrix.black.colors.calendar.gradient,
        },
      },
    ],
    [themeColorMatrix]
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return tokenRows;
    }

    return tokenRows.filter((row) => {
      const searchable = [
        row.token,
        row.meaning,
        row.values.light,
        row.values.dark,
        row.values.glass,
        row.values.black,
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [query, tokenRows]);

  return (
    <div className="space-y-8">
      <section className="max-w-4xl">
        <p className={`${navetTypographyTokens.eyebrow} ${surface.textMuted}`}>
          Navet Color System
        </p>
        <h1 className={`mt-3 ${navetTypographyTokens.pageHeading} ${surface.textPrimary}`}>
          Accent palette and searchable design tokens
        </h1>
        <p className={`mt-4 max-w-3xl ${navetTypographyTokens.body} ${surface.textSecondary}`}>
          A cleaner Navet color reference inspired by Fluent UI’s color docs. Use the accent gallery
          for quick visual browsing, then use the token explorer to find exact tokens, meanings, and
          their values across Light, Dark, Glass, and Black themes.
        </p>
      </section>

      <section
        className={`rounded-[28px] border p-6 backdrop-blur-xl ${surface.panel} ${surface.border}`}
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={`${navetTypographyTokens.eyebrow} ${surface.textMuted}`}>Accent Colors</p>
            <h2 className={`mt-2 ${navetTypographyTokens.sectionHeading} ${surface.textPrimary}`}>
              Preset accent palette
            </h2>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-start gap-x-4 gap-y-3">
          {Object.entries(themeColorValues).map(([name, value]) => (
            <AccentSwatch key={name} name={name} value={value} />
          ))}
        </div>
      </section>

      <section
        className={`rounded-[28px] border p-6 backdrop-blur-xl ${surface.panel} ${surface.border}`}
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={`${navetTypographyTokens.eyebrow} ${surface.textMuted}`}>
              Token Explorer
            </p>
            <h2 className={`mt-2 ${navetTypographyTokens.sectionHeading} ${surface.textPrimary}`}>
              Search Navet tokens by name, meaning, or color
            </h2>
          </div>
          <p className={`${navetTypographyTokens.helper} ${surface.textMuted}`}>
            {filteredRows.length} tokens
          </p>
        </div>

        <div className="mt-5">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for tokens by name or color"
            leading={<Search className={`h-4 w-4 ${surface.textMuted}`} />}
            inputClassName="rounded-[18px]"
          />
        </div>

        <div className="mt-5 overflow-x-auto">
          <div className="min-w-[1080px] overflow-hidden rounded-[24px] border border-white/10">
            <div className="grid grid-cols-[320px_repeat(4,minmax(150px,1fr))] gap-4 border-b border-white/10 bg-white/[0.04] px-5 py-4">
              <p className={`${navetTypographyTokens.eyebrow} ${surface.textMuted}`}>
                Design Token
              </p>
              {THEME_COLUMNS.map((themeMode) => (
                <p
                  key={themeMode}
                  className={`${navetTypographyTokens.eyebrow} ${surface.textMuted}`}
                >
                  {themeMode === 'black'
                    ? 'Black'
                    : themeMode[0].toUpperCase() + themeMode.slice(1)}
                </p>
              ))}
            </div>

            {filteredRows.map((row) => (
              <div
                key={row.token}
                className="grid grid-cols-[320px_repeat(4,minmax(150px,1fr))] gap-4 border-b border-white/8 px-5 py-4 last:border-b-0"
              >
                <div>
                  <p className="font-mono text-[12px] leading-5 text-white/88">{row.token}</p>
                  <p className={`mt-1 ${navetTypographyTokens.helper} ${surface.textSecondary}`}>
                    {row.meaning}
                  </p>
                </div>
                {THEME_COLUMNS.map((themeMode) => (
                  <TokenCell
                    key={`${row.token}-${themeMode}`}
                    kind={row.kind}
                    themeMode={themeMode}
                    value={row.values[themeMode]}
                  />
                ))}
              </div>
            ))}

            {filteredRows.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className={`${navetTypographyTokens.label} ${surface.textPrimary}`}>
                  No matching tokens
                </p>
                <p className={`mt-2 ${navetTypographyTokens.helper} ${surface.textMuted}`}>
                  Try searching for a token name like `surface.panel`, `colors.lock`, or `orange`.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

const meta = {
  title: 'Theme/Colors',
  component: ColorsStory,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          "Navet color documentation page inspired by the structure of Fluent UI's color docs.",
          '',
          'What this page covers:',
          '- Preset accent colors from `themeColorValues`',
          '- Semantic status colors from `navetSemanticColorTokens`',
          '- Searchable runtime color tokens across Light, Dark, Glass, and Black',
          '',
          'Usage notes:',
          '- Use the accent gallery for quick visual browsing',
          '- Use the token explorer when you need the exact Navet token and its meaning',
          '- Search works across token names, meanings, and color/class values',
        ].join('\n'),
      },
    },
  },
} satisfies Meta<typeof ColorsStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Docs: Story = {
  parameters: {
    docsOnly: true,
  },
};
