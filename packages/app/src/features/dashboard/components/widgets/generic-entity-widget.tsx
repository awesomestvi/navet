import { BaseCard } from '@navet/app/components/primitives';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useIntegrationStore, useTheme } from '@navet/app/hooks';
import { integrationSelectors } from '@navet/app/stores/selectors';
import { Activity, CircleAlert, CircleHelp, CircleSlash } from 'lucide-react';

export interface GenericEntityWidgetData {
  entityId?: string;
}

interface GenericEntityWidgetProps {
  size: CardSize;
  data?: GenericEntityWidgetData;
}

function formatEntityState(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return 'Unknown';
  }

  if (typeof value === 'boolean') {
    return value ? 'On' : 'Off';
  }

  return String(value);
}

function formatEntityType(type: string | undefined) {
  if (!type) {
    return 'Entity';
  }

  return type
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatLastUpdated(value: string | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getAvailabilityMeta(availability: string | undefined) {
  switch (availability) {
    case 'available':
      return {
        label: 'Available',
        Icon: Activity,
        className: 'text-emerald-300',
      };
    case 'unavailable':
      return {
        label: 'Unavailable',
        Icon: CircleSlash,
        className: 'text-amber-300',
      };
    case 'unknown':
      return {
        label: 'Unknown',
        Icon: CircleHelp,
        className: 'text-white/55',
      };
    default:
      return {
        label: 'Unknown',
        Icon: CircleAlert,
        className: 'text-white/55',
      };
  }
}

export function GenericEntityWidget({ size, data }: GenericEntityWidgetProps) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const entityId = data?.entityId;
  const entity = useIntegrationStore((state) => {
    if (!entityId) {
      return null;
    }

    const directEntity = integrationSelectors.providerEntityViewsByCanonicalId(state)[entityId];
    if (directEntity) {
      return directEntity;
    }

    for (const providerViews of Object.values(
      integrationSelectors.providerEntityViewsByProviderId(state)
    )) {
      const matchedView = Object.values(providerViews).find(
        (view) =>
          view.id === entityId || view.externalId === entityId || view.canonicalId === entityId
      );
      if (matchedView) {
        return matchedView;
      }
    }

    return null;
  });

  const availability = getAvailabilityMeta(entity?.availability);
  const AvailabilityIcon = availability.Icon;
  const lastUpdated = formatLastUpdated(entity?.lastUpdated);
  const entityType = formatEntityType(entity?.type);

  return (
    <BaseCard size={size} className="overflow-hidden">
      <div className="flex h-full min-h-0 flex-col justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span
              className={`truncate text-[0.7rem] font-semibold uppercase tracking-[0.08em] ${surface.textSecondary}`}
            >
              {entityType}
            </span>
            <span
              className={`inline-flex shrink-0 items-center gap-1 text-[0.68rem] font-semibold ${availability.className}`}
            >
              <AvailabilityIcon className="h-3 w-3" aria-hidden="true" />
              {availability.label}
            </span>
          </div>
          <h3 className={`truncate text-sm font-semibold ${surface.textPrimary}`}>
            {entity?.name ?? entityId ?? 'Entity'}
          </h3>
          {entity?.room ? (
            <p className={`mt-1 truncate text-xs ${surface.textSecondary}`}>{entity.room}</p>
          ) : null}
        </div>

        <div className="min-w-0">
          <div className={`truncate text-2xl font-semibold ${surface.textPrimary}`}>
            {formatEntityState(entity?.primaryState)}
          </div>
          <div className={`mt-1 truncate text-[0.7rem] ${surface.textMuted}`}>
            {lastUpdated ?? entity?.externalId ?? entity?.canonicalId ?? entityId}
          </div>
        </div>
      </div>
    </BaseCard>
  );
}
