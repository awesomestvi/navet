import { User } from 'lucide-react';
import { memo } from 'react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { type CardSize, getStandardCardPadding } from '@/app/components/shared/card-size-selector';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { useAuth } from '@/app/contexts/auth-context';
import { useHomeAssistant, useI18n, useTheme } from '@/app/hooks';
import { authSelectors, homeAssistantSelectors } from '@/app/stores/selectors';
import { getPersonCardSurfaceTokens } from './person-card-surface-tokens';

interface PersonCardProps {
  id: string;
  name: string;
  room: string;
  location: string;
  state: 'home' | 'away';
  entityPicture?: string;
  size: CardSize;
  onSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
}

function getFirstString(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function getBatteryLevel(attributes: Record<string, unknown> | undefined) {
  const rawValue = attributes?.battery_level ?? attributes?.battery;
  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
    return Math.max(0, Math.min(100, Math.round(rawValue)));
  }

  if (typeof rawValue === 'string') {
    const parsed = Number.parseFloat(rawValue);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.min(100, Math.round(parsed)));
    }
  }

  return null;
}

export const PersonCard = memo(function PersonCard({
  id,
  name,
  room,
  location,
  state,
  entityPicture,
  size,
  onSizeChange: _onSizeChange,
  isEditMode: _isEditMode,
}: PersonCardProps) {
  const { t } = useI18n();
  const { theme, colors } = useTheme();
  const cardShell = getCardShellSurfaceTokens(theme);
  const config = useAuth(authSelectors.config);
  const liveEntity = useHomeAssistant(homeAssistantSelectors.entity(id));

  const liveState: 'home' | 'away' =
    liveEntity?.state === 'home' ? 'home' : liveEntity ? 'away' : state;
  const liveAttrs = liveEntity?.attributes as Record<string, unknown> | undefined;
  const liveEntityPicture =
    typeof liveAttrs?.entity_picture === 'string'
      ? (liveAttrs.entity_picture as string)
      : entityPicture;
  const batteryLevel = getBatteryLevel(liveAttrs);
  const presenceLabel = liveState === 'home' ? t('person.home') : t('person.away');
  const detailLabel =
    liveState === 'home'
      ? getFirstString(room, location)
      : getFirstString(
          typeof liveAttrs?.address === 'string' ? liveAttrs.address : null,
          typeof liveAttrs?.location_name === 'string' ? liveAttrs.location_name : null,
          typeof liveAttrs?.geocoded_location === 'string' ? liveAttrs.geocoded_location : null,
          typeof liveAttrs?.zone === 'string' ? liveAttrs.zone : null,
          location
        );

  const cardColors = liveState === 'home' ? colors.person.home : colors.person.away;
  const surface = getPersonCardSurfaceTokens(theme, liveState);
  const padding = getStandardCardPadding(size);
  const resolvedEntityPicture = liveEntityPicture?.startsWith('/')
    ? `${config?.url ?? ''}${liveEntityPicture}`
    : liveEntityPicture;
  const hasPortrait = Boolean(resolvedEntityPicture);
  const isTiny = size === 'tiny';
  const isExtraSmall = size === 'extra-small';
  const nameTextClassName = isTiny ? 'text-[11px]' : isExtraSmall ? 'text-xs' : 'text-sm';
  const eyebrowTextClassName = isTiny ? 'text-[9px]' : 'text-[10px]';
  const pillTextClassName = isTiny ? 'text-[9px]' : 'text-[10px]';

  return (
    <div
      className={`relative h-full ${cardShell.backdropClassName} rounded-3xl ${theme !== 'dark' ? 'border' : ''} ${cardColors.border} overflow-hidden ${surface.containerShadowClassName}`}
    >
      {hasPortrait ? (
        <ImageWithFallback
          src={resolvedEntityPicture}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <div
          className={`absolute inset-0 bg-gradient-to-br ${surface.fallbackBackgroundClassName}`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_55%)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full border border-white/12 bg-black/10 p-4 backdrop-blur-sm">
              <User className={`h-7 w-7 ${surface.fallbackIconClassName}`} />
            </div>
          </div>
        </div>
      )}

      <div className={`absolute inset-0 bg-gradient-to-t ${cardColors.glow} to-transparent`} />
      <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-black/88 via-black/38 to-transparent" />
      {surface.overlayClassName && (
        <div className={`absolute inset-0 ${surface.overlayClassName}`} />
      )}

      <div className={`relative flex h-full items-end ${padding}`}>
        <div className="min-w-0 max-w-full">
          <div
            className={`truncate text-white/80 drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)] ${eyebrowTextClassName}`}
          >
            {detailLabel ?? presenceLabel}
          </div>
          <div
            className={`mt-0.5 truncate font-semibold leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] ${nameTextClassName}`}
          >
            {name}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {detailLabel && detailLabel !== presenceLabel ? (
              <div
                className={`max-w-[11rem] truncate rounded-full border border-white/12 bg-black/28 px-2.5 py-1 text-white/78 backdrop-blur-sm ${pillTextClassName}`}
              >
                {detailLabel}
              </div>
            ) : null}
            {batteryLevel !== null ? (
              <div
                className={`inline-flex items-center rounded-full border border-white/12 bg-black/28 px-2.5 py-1 text-white/78 backdrop-blur-sm ${pillTextClassName}`}
              >
                {t('vacuum.settings.battery')}: {batteryLevel}%
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
});
