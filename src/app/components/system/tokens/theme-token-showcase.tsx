import type { ReactNode } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import { navetRadiusTokens, navetSpacingTokens, navetTypographyTokens } from './foundations';

type TokenPrimitive = string | number | boolean;
type TokenTree = {
  [key: string]: TokenPrimitive | TokenTree;
};

function flattenTokens(tokens: TokenTree, prefix = ''): Array<[string, TokenPrimitive]> {
  return Object.entries(tokens).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return [[fullKey, value]];
    }

    return flattenTokens(value as TokenTree, fullKey);
  });
}

export function ThemeTokenShowcase({
  intro,
  tokens,
  previewTitle,
  preview,
}: {
  intro: string;
  tokens: TokenTree;
  previewTitle?: string;
  preview?: ReactNode;
}) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const rows = flattenTokens(tokens);

  return (
    <div className={navetSpacingTokens.stack.lg}>
      <div className="max-w-3xl">
        <p className={`${navetTypographyTokens.body} ${surface.textSecondary}`}>{intro}</p>
      </div>

      {preview ? (
        <section
          className={`${navetRadiusTokens.panel} border p-5 backdrop-blur-xl ${surface.panel} ${surface.border}`}
        >
          {previewTitle ? (
            <h2 className={`${navetTypographyTokens.sectionHeading} ${surface.textPrimary}`}>
              {previewTitle}
            </h2>
          ) : null}
          <div className={previewTitle ? 'mt-3' : ''}>{preview}</div>
        </section>
      ) : null}

      <section
        className={`${navetRadiusTokens.panel} border p-5 backdrop-blur-xl ${surface.panel} ${surface.border}`}
      >
        <h2 className={`${navetTypographyTokens.sectionHeading} ${surface.textPrimary}`}>
          Token reference
        </h2>
        <div className={`grid ${navetSpacingTokens.stack.sm}`}>
          {rows.map(([key, value]) => (
            <div
              key={key}
              className={`mt-3 grid gap-1 border px-4 py-3 sm:grid-cols-[160px_1fr] ${navetRadiusTokens.action} ${surface.border} ${surface.panelMuted}`}
            >
              <span className={`${navetTypographyTokens.helper} font-medium ${surface.textSubtle}`}>
                {key}
              </span>
              <code className={`break-all ${navetTypographyTokens.helper} ${surface.textPrimary}`}>
                {String(value)}
              </code>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
