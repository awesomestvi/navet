import { Input } from '@navet/app/components/primitives';
import { themeColorValues } from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { useTheme } from '@navet/app/hooks/use-theme';
import { generateThemeColors } from '@navet/app/hooks/use-theme-colors';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { navetSemanticColorTokens, navetTypographyTokens } from './foundations';

const THEME_COLUMNS: ThemeType[] = ['light', 'dark', 'glass', 'black'];

type TokenKind = 'hex' | 'semantic' | 'surface' | 'border' | 'text' | 'gradient';

type TokenRow = {
  token: string;
  meaning: string;
  kind: TokenKind;
  values: Record<ThemeType, string>;
};

const TOKEN_LABELS: Record<string, string> = {
  'surface.textPrimary': 'Primary text',
  'surface.textSecondary': 'Secondary text',
  'surface.textMuted': 'Muted text',
  'surface.panel': 'Primary panel',
  'surface.panelMuted': 'Muted panel',
  'surface.iconBg': 'Icon background',
  'surface.subtleBg': 'Subtle background',
  'surface.border': 'Default border',
  'colors.light.gradient': 'Active light',
  'colors.media.gradient': 'Media',
  'colors.lock.locked.gradient': 'Locked',
  'colors.lock.unlocked.gradient': 'Unlocked',
  'colors.cover.open.gradient': 'Open cover',
  'colors.climate.heating.gradient': 'Heating',
  'colors.climate.cooling.gradient': 'Cooling',
  'colors.person.home.gradient': 'Home presence',
  'colors.vacuum.cleaning.gradient': 'Vacuum cleaning',
  'colors.rss.gradient': 'RSS feed',
  'colors.calendar.gradient': 'Calendar',
};

function getTokenLabel(token: string) {
  const mappedLabel = TOKEN_LABELS[token];
  if (mappedLabel) {
    return mappedLabel;
  }

  const finalSegment = token.split('.').at(-1) ?? token;
  return finalSegment
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function formatColorClass(value: string) {
  return value
    .replace(/^(?:text|bg|border)-/, '')
    .replace(/-(\d)/g, ' $1')
    .replace('/', ' · ')
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function getReadableValue(kind: TokenKind, value: string) {
  if (kind === 'hex') {
    return value.toUpperCase();
  }

  if (kind === 'semantic') {
    return 'Shared status recipe';
  }

  if (value.includes('linear-gradient')) {
    return 'Layered glass';
  }

  if (value.includes('rgba')) {
    return 'Translucent neutral';
  }

  if (kind === 'gradient') {
    const from = value.match(/from-([^\s]+)/)?.[1];
    const to = value.match(/to-([^\s]+)/)?.[1];
    if (from && to) {
      return `${formatColorClass(from)} → ${formatColorClass(to)}`;
    }
  }

  return formatColorClass(value);
}

function getResolvedGroup(row: TokenRow) {
  if (row.kind === 'text') {
    return 'Text';
  }

  if (row.kind === 'surface' || row.kind === 'border') {
    return 'Surfaces and borders';
  }

  return 'Device and content states';
}

function repeatAcrossThemes(value: string): Record<ThemeType, string> {
  return {
    light: value,
    dark: value,
    glass: value,
    black: value,
  };
}

function isThemeInvariant(row: TokenRow) {
  return new Set(THEME_COLUMNS.map((themeMode) => row.values[themeMode])).size === 1;
}

function TokenCell({
  kind,
  themeMode,
  value,
  valueClassName,
  showValue = true,
  centered = false,
}: {
  kind: TokenKind;
  themeMode: ThemeType;
  value: string;
  valueClassName: string;
  showValue?: boolean;
  centered?: boolean;
}) {
  const themeSurface = getThemeSurfaceTokens(themeMode);
  const readableValue = getReadableValue(kind, value);

  return (
    <div className={`min-w-0 ${centered ? 'flex flex-col items-center' : ''}`}>
      {kind === 'hex' ? (
        <div
          className="h-14 w-14 rounded-full border"
          style={{ backgroundColor: value, borderColor: `${value}55` }}
        />
      ) : kind === 'semantic' ? (
        <div className="rounded-xl bg-zinc-950 p-1.5">
          <div
            className={`flex h-9 items-center rounded-lg border px-3 text-xs font-medium ${value}`}
          >
            Status
          </div>
        </div>
      ) : kind === 'text' ? (
        <div
          className={`flex h-12 items-center rounded-xl border px-4 ${themeSurface.border} ${themeSurface.panelMuted}`}
        >
          <span className={`${value} text-sm font-semibold`}>Aa</span>
        </div>
      ) : kind === 'border' ? (
        <div className={`h-12 rounded-xl border-2 ${themeSurface.panelMuted} ${value}`} />
      ) : kind === 'surface' ? (
        <div className={`h-12 rounded-xl border ${themeSurface.border} ${value}`} />
      ) : (
        <div
          className={`h-12 rounded-xl border ${themeSurface.border} bg-gradient-to-br ${value}`}
        />
      )}

      {showValue ? (
        <p className={`mt-2 truncate text-xs ${valueClassName}`} title={value}>
          {readableValue}
        </p>
      ) : null}
      <code translate="no" className="sr-only">
        {value}
      </code>
    </div>
  );
}

function StableTokenCard({
  row,
  activeTheme,
  surface,
  className,
  centered = false,
}: {
  row: TokenRow;
  activeTheme: ThemeType;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  className?: string;
  centered?: boolean;
}) {
  const value = row.values[activeTheme];

  return (
    <li className={`min-w-0 ${centered ? 'text-center' : ''} ${className ?? ''}`}>
      <article
        data-color-scope="theme-invariant"
        data-token={row.token}
        data-token-kind={row.kind}
        data-token-value={value}
        className="h-full min-w-0 pb-2"
      >
        <TokenCell
          kind={row.kind}
          themeMode={activeTheme}
          value={value}
          valueClassName={surface.textMuted}
          showValue={false}
          centered={centered}
        />
        <p className={`mt-3 text-sm font-semibold ${surface.textPrimary}`}>
          {getTokenLabel(row.token)}
        </p>
        {row.kind === 'hex' ? (
          <p className={`mt-1 font-mono text-xs ${surface.textMuted}`}>{value.toUpperCase()}</p>
        ) : null}
        <code translate="no" className="sr-only">
          {row.token}
        </code>
        {row.kind === 'hex' ? null : (
          <p className={`mt-1 text-xs leading-5 ${surface.textSecondary}`}>{row.meaning}</p>
        )}
      </article>
    </li>
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
        token: 'colors.climate.heating.gradient',
        meaning: 'Heating mode background family',
        kind: 'gradient',
        values: {
          light: themeColorMatrix.light.colors.climate.heating.gradient,
          dark: themeColorMatrix.dark.colors.climate.heating.gradient,
          glass: themeColorMatrix.glass.colors.climate.heating.gradient,
          black: themeColorMatrix.black.colors.climate.heating.gradient,
        },
      },
      {
        token: 'colors.climate.cooling.gradient',
        meaning: 'Cooling mode background family',
        kind: 'gradient',
        values: {
          light: themeColorMatrix.light.colors.climate.cooling.gradient,
          dark: themeColorMatrix.dark.colors.climate.cooling.gradient,
          glass: themeColorMatrix.glass.colors.climate.cooling.gradient,
          black: themeColorMatrix.black.colors.climate.cooling.gradient,
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
        getTokenLabel(row.token),
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
  const invariantRows = filteredRows.filter(isThemeInvariant);
  const invariantPaletteRows = invariantRows.filter((row) => row.kind === 'hex');
  const invariantRecipeRows = invariantRows.filter((row) => row.kind !== 'hex');
  const themeResolvedRows = filteredRows.filter((row) => !isThemeInvariant(row));
  const themeResolvedGroups = [
    {
      label: 'Text',
      rows: themeResolvedRows.filter((row) => getResolvedGroup(row) === 'Text'),
    },
    {
      label: 'Surfaces and borders',
      rows: themeResolvedRows.filter((row) => getResolvedGroup(row) === 'Surfaces and borders'),
    },
    {
      label: 'Device and content states',
      rows: themeResolvedRows.filter(
        (row) => getResolvedGroup(row) === 'Device and content states'
      ),
    },
  ].filter((group) => group.rows.length > 0);

  return (
    <div>
      <section className="max-w-4xl">
        <div style={{ paddingBottom: '32px' }}>
          <p className={`${navetTypographyTokens.eyebrow} ${surface.textMuted}`}>
            Navet Color System
          </p>
          <h1 className={`mt-3 ${navetTypographyTokens.pageHeading} ${surface.textPrimary}`}>
            Navet colors
          </h1>
          <p className={`mt-4 max-w-3xl ${navetTypographyTokens.body} ${surface.textSecondary}`}>
            Browse the colors shared by every theme, then compare the roles that adapt across Light,
            Dark, Glass, and Black.
          </p>
        </div>
      </section>

      <section
        aria-labelledby="color-token-search-heading"
        className={`border-b ${surface.border}`}
      >
        <div className="py-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="color-token-search-heading"
              className={`${navetTypographyTokens.sectionHeading} ${surface.textPrimary}`}
            >
              Find a color token
            </h2>
            <p
              aria-live="polite"
              className={`${navetTypographyTokens.helper} ${surface.textMuted}`}
            >
              {invariantRows.length} shared · {themeResolvedRows.length} adaptive
            </p>
          </div>
          <div className="mt-4 max-w-3xl">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              name="color-token-search"
              aria-label="Search color tokens"
              autoComplete="off"
              placeholder="Search by token, purpose, color, or class…"
              leading={<Search aria-hidden="true" className={`h-4 w-4 ${surface.textMuted}`} />}
              inputClassName="rounded-[18px]"
            />
          </div>
        </div>
      </section>

      <section
        aria-labelledby="theme-invariant-colors-heading"
        className={`border-b pt-8 pb-10 ${surface.border}`}
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              id="theme-invariant-colors-heading"
              className={`${navetTypographyTokens.sectionHeading} ${surface.textPrimary}`}
            >
              Colors shared by every theme
            </h2>
            <p className={`mt-2 max-w-3xl text-sm leading-6 ${surface.textSecondary}`}>
              Preset accents and status recipes keep the same values everywhere.
            </p>
          </div>
        </div>

        {invariantPaletteRows.length > 0 ? (
          <div className="mt-5">
            <h3 className={`text-sm font-semibold ${surface.textPrimary}`}>Accent palette</h3>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-6">
              {invariantPaletteRows.map((row) => (
                <StableTokenCard
                  key={row.token}
                  row={row}
                  activeTheme={theme}
                  surface={surface}
                  className="w-20 shrink-0"
                  centered
                />
              ))}
            </ul>
          </div>
        ) : null}

        {invariantRecipeRows.length > 0 ? (
          <div className="mt-8">
            <h3 className={`text-sm font-semibold ${surface.textPrimary}`}>Status recipes</h3>
            <p className={`mt-1 text-xs leading-5 ${surface.textMuted}`}>
              Shown on a dark sample so the shared foreground colors remain readable.
            </p>
            <ul
              className="mt-4 grid gap-x-5 gap-y-7"
              style={{
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
              }}
            >
              {invariantRecipeRows.map((row) => (
                <StableTokenCard key={row.token} row={row} activeTheme={theme} surface={surface} />
              ))}
            </ul>
          </div>
        ) : null}

        {invariantRows.length === 0 && filteredRows.length > 0 ? (
          <p className={`mt-5 text-sm ${surface.textMuted}`}>No shared colors match this search.</p>
        ) : null}
      </section>

      <section aria-labelledby="theme-resolved-colors-heading" className="pt-8 pb-6">
        <div>
          <h2
            id="theme-resolved-colors-heading"
            className={`${navetTypographyTokens.sectionHeading} ${surface.textPrimary}`}
          >
            Colors that adapt by theme
          </h2>
          <p className={`mt-2 max-w-3xl text-sm leading-6 ${surface.textSecondary}`}>
            Read across a row to compare how the same role changes in each theme.
          </p>
        </div>

        {themeResolvedRows.length > 0 ? (
          <div className="mt-5 overflow-x-auto">
            <table
              aria-label="Theme-resolved Navet color tokens"
              className="w-full table-fixed border-collapse"
              style={{ minWidth: '1080px' }}
            >
              <colgroup>
                <col style={{ width: '320px' }} />
                {THEME_COLUMNS.map((themeMode) => (
                  <col key={themeMode} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th
                    scope="col"
                    className={`border-b px-5 py-4 text-left ${surface.border} ${navetTypographyTokens.eyebrow} ${surface.textMuted}`}
                  >
                    Token and purpose
                  </th>
                  {THEME_COLUMNS.map((themeMode) => (
                    <th
                      key={themeMode}
                      scope="col"
                      data-theme={themeMode}
                      className={`border-b px-3 py-4 text-left ${surface.border} ${navetTypographyTokens.eyebrow} ${surface.textMuted}`}
                    >
                      {themeMode[0].toUpperCase() + themeMode.slice(1)}
                    </th>
                  ))}
                </tr>
              </thead>
              {themeResolvedGroups.map((group) => (
                <tbody key={group.label}>
                  <tr>
                    <th
                      scope="rowgroup"
                      colSpan={5}
                      className={`border-b px-5 text-left text-xs font-semibold uppercase tracking-[0.14em] ${surface.border} ${surface.textMuted}`}
                    >
                      <div className="py-4">{group.label}</div>
                    </th>
                  </tr>
                  {group.rows.map((row) => (
                    <tr
                      key={row.token}
                      data-color-scope="theme-resolved"
                      data-token={row.token}
                      data-token-kind={row.kind}
                      className={`border-b ${surface.border}`}
                    >
                      <th scope="row" className="px-5 py-5 text-left align-top font-normal">
                        <p className={`text-sm font-semibold ${surface.textPrimary}`}>
                          {getTokenLabel(row.token)}
                        </p>
                        <p
                          className={`mt-1 ${navetTypographyTokens.helper} ${surface.textSecondary}`}
                        >
                          {row.meaning}
                        </p>
                        <code
                          translate="no"
                          className={`mt-2 block break-words font-mono text-[11px] leading-4 ${surface.textMuted}`}
                        >
                          {row.token}
                        </code>
                      </th>
                      {THEME_COLUMNS.map((themeMode) => (
                        <td
                          key={`${row.token}-${themeMode}`}
                          data-theme={themeMode}
                          data-token-value={row.values[themeMode]}
                          className="px-3 py-5 align-top"
                        >
                          <TokenCell
                            kind={row.kind}
                            themeMode={themeMode}
                            value={row.values[themeMode]}
                            valueClassName={surface.textMuted}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        ) : filteredRows.length > 0 ? (
          <p className={`mt-5 text-sm ${surface.textMuted}`}>
            No adaptive colors match this search.
          </p>
        ) : null}
      </section>

      {filteredRows.length === 0 ? (
        <section aria-live="polite" className={`border-t px-5 py-8 text-center ${surface.border}`}>
          <p className={`${navetTypographyTokens.label} ${surface.textPrimary}`}>
            No matching color tokens
          </p>
          <p className={`mt-2 ${navetTypographyTokens.helper} ${surface.textMuted}`}>
            Try a token name such as `surface.panel`, `colors.lock`, or `orange`.
          </p>
        </section>
      ) : null}
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
          'Navet color reference organized by whether a token is stable or resolved by theme.',
          '',
          'What this story proves:',
          '- Theme-invariant preset accents and semantic status recipes are documented once.',
          '- Theme-resolved surface and domain tokens are compared across Light, Dark, Glass, and Black.',
          '- Semantic table markup and token metadata keep the reference readable for people and tooling.',
          '',
          'Use this story when:',
          '- Use the stable palette when a raw accent or status recipe is explicitly required.',
          '- Prefer the theme-resolved matrix for product surfaces, text, borders, and card states.',
          '- Search across token names, meanings, colors, and generated classes.',
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
