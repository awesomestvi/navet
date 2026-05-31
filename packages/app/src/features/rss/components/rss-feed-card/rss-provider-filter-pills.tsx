import { InteractivePill } from '@navet/app/components/primitives';
import { getRSSControlPillStyle } from '@navet/app/components/shared/theme/rss-widget-surface-tokens';
import type { ThemeType } from '@navet/app/hooks';
import { useI18n } from '@navet/app/hooks';
import type { RSSFeedCardSurfaceTokens } from './surface-tokens';
import type { RSSProvider } from './types';

interface RSSProviderFilterPillsProps {
  selectedProviders: RSSProvider[];
  activeProviderId: 'all' | string;
  onActiveProviderChange: (providerId: 'all' | string) => void;
  rssSurface: RSSFeedCardSurfaceTokens;
  controlAccentColor: string;
  theme: ThemeType;
}

export function RSSProviderFilterPills({
  selectedProviders,
  activeProviderId,
  onActiveProviderChange,
  rssSurface,
  controlAccentColor,
  theme,
}: RSSProviderFilterPillsProps) {
  const { t } = useI18n();

  return (
    <div className="min-w-0 flex-1">
      <div className="flex gap-1 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <InteractivePill
          active={activeProviderId === 'all'}
          size="compact"
          className={`shrink-0 text-xs ${rssSurface.surface.border}`}
          style={getRSSControlPillStyle({
            accentColor: controlAccentColor,
            isActive: activeProviderId === 'all',
            theme,
            textPrimaryColor: rssSurface.textPrimaryColor,
            textSecondaryColor: rssSurface.textSecondaryColor,
          })}
          onClick={(event) => {
            event.stopPropagation();
            onActiveProviderChange('all');
          }}
        >
          {t('rss.filter.all')}
        </InteractivePill>
        {selectedProviders.map((provider) => (
          <InteractivePill
            key={provider.id}
            active={activeProviderId === provider.id}
            size="compact"
            className={`shrink-0 text-xs ${rssSurface.surface.border}`}
            style={getRSSControlPillStyle({
              accentColor: controlAccentColor,
              isActive: activeProviderId === provider.id,
              theme,
              textPrimaryColor: rssSurface.textPrimaryColor,
              textSecondaryColor: rssSurface.textSecondaryColor,
            })}
            onClick={(event) => {
              event.stopPropagation();
              onActiveProviderChange(provider.id);
            }}
          >
            {getCompactProviderLabel(provider.name)}
          </InteractivePill>
        ))}
      </div>
    </div>
  );
}

function getCompactProviderLabel(label: string) {
  const normalized = label.trim();

  if (/^bbc\b/i.test(normalized)) {
    return 'BBC';
  }

  if (normalized.length <= 12) {
    return normalized;
  }

  return normalized.split(/\s+/)[0] ?? normalized;
}
