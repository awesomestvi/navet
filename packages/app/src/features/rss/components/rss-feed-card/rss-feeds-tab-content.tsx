import { SelectableCheckboxList, SelectableCheckboxRow } from '@navet/app/components/patterns';
import { InteractivePill } from '@navet/app/components/primitives';
import { DialogSectionRow } from '@navet/app/components/shared/device-editor';
import { withTintAlpha } from '@navet/app/components/shared/theme/custom-card-tint-surface';
import type { TranslateFn } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { Trash2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { RSSFeedCardSurfaceTokens } from './surface-tokens';
import type { RSSProvider } from './types';

interface RSSFeedsTabContentProps {
  hasProviders: boolean;
  providers: RSSProvider[];
  selectedProviderIds: string[];
  onToggleProvider: (providerId: string) => void;
  onRemoveProvider?: (providerId: string) => void;
  accentColorValue: string;
  theme: ThemeType;
  textPrimaryColor: string;
  textSecondaryColor: string;
  sectionStyle?: CSSProperties;
  surface: RSSFeedCardSurfaceTokens;
  t: TranslateFn;
}

export function RSSFeedsTabContent({
  hasProviders,
  providers,
  selectedProviderIds,
  onToggleProvider,
  onRemoveProvider,
  accentColorValue,
  theme,
  textPrimaryColor,
  textSecondaryColor,
  surface,
  t,
}: RSSFeedsTabContentProps) {
  if (!hasProviders) {
    return (
      <div
        className={`rounded-2xl border border-dashed px-4 py-5 text-sm ${surface.surface.border} ${surface.surface.textSecondary}`}
      >
        {t('rss.settings.emptyState')}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-sm:space-y-3">
      <RSSProviderGroup
        title={t('rss.settings.savedDirectFeeds')}
        providers={providers}
        selectedProviderIds={selectedProviderIds}
        onToggleProvider={onToggleProvider}
        onRemoveProvider={onRemoveProvider}
        accentColorValue={accentColorValue}
        theme={theme}
        textPrimaryColor={textPrimaryColor}
        textSecondaryColor={textSecondaryColor}
        surface={surface}
        t={t}
      />
    </div>
  );
}

function RSSProviderGroup({
  title,
  providers,
  selectedProviderIds,
  onToggleProvider,
  onRemoveProvider,
  accentColorValue,
  theme,
  textPrimaryColor,
  textSecondaryColor,
  surface,
  t,
}: {
  title: string;
  providers: RSSProvider[];
  selectedProviderIds: string[];
  onToggleProvider: (providerId: string) => void;
  onRemoveProvider?: (providerId: string) => void;
  accentColorValue: string;
  theme: ThemeType;
  textPrimaryColor: string;
  textSecondaryColor: string;
  surface: RSSFeedCardSurfaceTokens;
  t: TranslateFn;
}) {
  const idleBackgroundAlpha = theme === 'light' ? 0.08 : 0.12;
  const idleBorderAlpha = theme === 'light' ? 0.16 : 0.22;

  return (
    <DialogSectionRow label={title} className="max-sm:mb-0">
      <SelectableCheckboxList>
        {providers.map((provider) => {
          const isSelected = selectedProviderIds.includes(provider.id);
          const secondaryLabel = provider.feedUrl;
          const isRemovable = Boolean(onRemoveProvider);

          return (
            <li key={provider.id}>
              <SelectableCheckboxRow
                checked={isSelected}
                onCheckedChange={() => onToggleProvider(provider.id)}
                label={
                  <span className="block min-w-0 truncate" style={{ color: textPrimaryColor }}>
                    {provider.name}
                  </span>
                }
                description={
                  <span
                    className="block min-w-0 w-full overflow-hidden text-ellipsis whitespace-nowrap"
                    style={{ color: textSecondaryColor }}
                  >
                    {secondaryLabel}
                  </span>
                }
                className="max-sm:gap-2 max-sm:px-3 max-sm:py-2.5"
                rowClassName={`${surface.surface.textPrimary} ${surface.surface.hoverBg}`}
                labelClassName="truncate"
                descriptionClassName="min-w-0 max-w-full overflow-hidden"
                checkboxPaletteColor={accentColorValue}
                action={
                  isRemovable ? (
                    <InteractivePill
                      active={false}
                      intent="action"
                      size="compact"
                      className="min-h-8 w-8 shrink-0 px-0"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onRemoveProvider?.(provider.id);
                      }}
                      style={{
                        backgroundColor: withTintAlpha(accentColorValue, idleBackgroundAlpha),
                        color: textPrimaryColor,
                        borderColor: withTintAlpha(accentColorValue, idleBorderAlpha),
                      }}
                      aria-label={t('rss.settings.removeProvider', { name: provider.name })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </InteractivePill>
                  ) : null
                }
              />
            </li>
          );
        })}
      </SelectableCheckboxList>
    </DialogSectionRow>
  );
}
