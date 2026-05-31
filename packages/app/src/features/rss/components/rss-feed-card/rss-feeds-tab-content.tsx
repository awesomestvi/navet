import { SelectableCheckboxRow } from '@navet/app/components/patterns';
import { InteractivePill } from '@navet/app/components/primitives';
import { DialogSectionRow } from '@navet/app/components/shared/device-editor';
import { withTintAlpha } from '@navet/app/components/shared/theme/custom-card-tint-surface';
import type { TranslateFn } from '@navet/app/hooks';
import { Trash2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { RSSFeedCardSurfaceTokens } from './surface-tokens';
import type { RSSProvider } from './types';

interface RSSFeedsTabContentProps {
  hasProviders: boolean;
  homeAssistantProviders: RSSProvider[];
  directProviders: RSSProvider[];
  selectedProviderIds: string[];
  onToggleProvider: (providerId: string) => void;
  onRemoveProvider?: (providerId: string) => void;
  accentColorValue: string;
  textPrimaryColor: string;
  textSecondaryColor: string;
  sectionStyle?: CSSProperties;
  surface: RSSFeedCardSurfaceTokens;
  t: TranslateFn;
}

export function RSSFeedsTabContent({
  hasProviders,
  homeAssistantProviders,
  directProviders,
  selectedProviderIds,
  onToggleProvider,
  onRemoveProvider,
  accentColorValue,
  textPrimaryColor,
  textSecondaryColor,
  sectionStyle,
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
      {homeAssistantProviders.length > 0 && (
        <RSSProviderGroup
          title={t('rss.settings.availableHomeAssistantFeeds')}
          providers={homeAssistantProviders}
          selectedProviderIds={selectedProviderIds}
          onToggleProvider={onToggleProvider}
          accentColorValue={accentColorValue}
          textPrimaryColor={textPrimaryColor}
          textSecondaryColor={textSecondaryColor}
          sectionStyle={sectionStyle}
          surface={surface}
          t={t}
        />
      )}

      {directProviders.length > 0 && (
        <RSSProviderGroup
          title={t('rss.settings.savedDirectFeeds')}
          providers={directProviders}
          selectedProviderIds={selectedProviderIds}
          onToggleProvider={onToggleProvider}
          onRemoveProvider={onRemoveProvider}
          accentColorValue={accentColorValue}
          textPrimaryColor={textPrimaryColor}
          textSecondaryColor={textSecondaryColor}
          sectionStyle={sectionStyle}
          surface={surface}
          t={t}
        />
      )}
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
  textPrimaryColor,
  textSecondaryColor,
  sectionStyle,
  surface,
  t,
}: {
  title: string;
  providers: RSSProvider[];
  selectedProviderIds: string[];
  onToggleProvider: (providerId: string) => void;
  onRemoveProvider?: (providerId: string) => void;
  accentColorValue: string;
  textPrimaryColor: string;
  textSecondaryColor: string;
  sectionStyle?: CSSProperties;
  surface: RSSFeedCardSurfaceTokens;
  t: TranslateFn;
}) {
  return (
    <DialogSectionRow label={title} className="max-sm:mb-0">
      <div className="min-w-0 max-w-full space-y-2 max-sm:space-y-1.5">
        {providers.map((provider) => {
          const isSelected = selectedProviderIds.includes(provider.id);
          const secondaryLabel =
            provider.type === 'home-assistant-feedreader' ? provider.entityId : provider.feedUrl;
          const isRemovable = provider.type === 'url' && onRemoveProvider;
          const rowStyle = {
            ...sectionStyle,
            backgroundColor: withTintAlpha(accentColorValue, isSelected ? 0.18 : 0.1),
            borderColor: withTintAlpha(accentColorValue, isSelected ? 0.38 : 0.24),
          } satisfies CSSProperties;

          return (
            <SelectableCheckboxRow
              key={provider.id}
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
              className="min-w-0 max-w-full overflow-hidden max-sm:gap-2"
              rowClassName={`w-full min-w-0 max-w-full items-center overflow-hidden px-4 max-sm:px-3 max-sm:py-2.5 ${surface.surface.border}`}
              labelClassName="truncate"
              descriptionClassName="min-w-0 max-w-full overflow-hidden"
              checkboxPaletteColor={accentColorValue}
              selectedStyle={rowStyle}
              unselectedStyle={rowStyle}
              trailing={
                isRemovable ? (
                  <InteractivePill
                    active={false}
                    intent="action"
                    size="compact"
                    className="shrink-0 min-h-8 w-8 px-0"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onRemoveProvider?.(provider.id);
                    }}
                    style={{
                      backgroundColor: withTintAlpha(accentColorValue, 0.1),
                      color: textSecondaryColor,
                      borderColor: withTintAlpha(accentColorValue, 0.24),
                    }}
                    aria-label={t('rss.settings.removeProvider', { name: provider.name })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </InteractivePill>
                ) : null
              }
            />
          );
        })}
      </div>
    </DialogSectionRow>
  );
}
