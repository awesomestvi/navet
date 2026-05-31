import { CardEmptyState } from '@navet/app/components/patterns';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { useI18n } from '@navet/app/hooks';
import { AlertCircle, Newspaper, Rss, Settings2 } from 'lucide-react';
import type { RSSFeedCardSurfaceTokens } from './surface-tokens';

interface RSSEmptyStateProps {
  hasConfiguredProviders: boolean;
  hasSelectedProviders: boolean;
  error: string | null;
  inEditMode: boolean;
  size: CardSize;
  rssSurface: RSSFeedCardSurfaceTokens;
  onOpenSettings: () => void;
}

export function RSSEmptyState({
  hasConfiguredProviders,
  hasSelectedProviders,
  error,
  size,
  rssSurface,
  onOpenSettings,
}: RSSEmptyStateProps) {
  const { t } = useI18n();
  const state = !hasConfiguredProviders
    ? {
        title: t('rss.empty.noProvidersTitle'),
        description: t('rss.empty.noProviders'),
        icon: Rss,
        actionLabel: t('rss.configureProviders'),
        actionIcon: Settings2,
        onAction: onOpenSettings,
      }
    : !hasSelectedProviders
      ? {
          title: t('rss.empty.noSelectionTitle'),
          description: t('rss.empty.noSelection'),
          icon: Settings2,
          actionLabel: t('rss.configureProviders'),
          actionIcon: Settings2,
          onAction: onOpenSettings,
        }
      : error
        ? {
            title: t('rss.error.unableToLoad'),
            description: error,
            icon: AlertCircle,
            actionLabel: undefined,
            actionIcon: undefined,
            onAction: undefined,
          }
        : {
            title: t('rss.empty.noArticlesTitle'),
            description: t('rss.empty.noArticles'),
            icon: Newspaper,
            actionLabel: undefined,
            actionIcon: undefined,
            onAction: undefined,
          };

  return (
    <CardEmptyState
      title={state.title}
      description={state.description}
      icon={state.icon}
      actionLabel={state.actionLabel}
      actionIcon={state.actionIcon}
      onAction={state.onAction}
      size={size}
      accentColor={rssSurface.resolvedTintColor ?? rssSurface.accentColor.base}
    />
  );
}
