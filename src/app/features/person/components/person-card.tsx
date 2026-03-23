import { Home, MapPin, User } from 'lucide-react';
import { memo } from 'react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { type CardSize, isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { EntityCardHeader } from '@/app/components/shared/entity-card-header';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { useAuth } from '@/app/contexts/auth-context';
import { useHomeAssistant, useI18n, useTheme } from '@/app/hooks';
import { homeAssistantSelectors } from '@/app/stores/selectors';
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
  const { config } = useAuth();
  const liveEntity = useHomeAssistant(homeAssistantSelectors.entity(id));

  // Size-specific styling
  const isSmall = isCompactCardSize(size);
  const padding = isSmall ? 'p-4' : 'p-5';

  const liveState: 'home' | 'away' =
    liveEntity?.state === 'home' ? 'home' : liveEntity ? 'away' : state;
  const liveLocation =
    liveEntity && liveEntity.state !== 'home' && liveEntity.state !== 'not_home'
      ? liveEntity.state
      : location;
  const liveAttrs = liveEntity?.attributes as Record<string, unknown> | undefined;
  const liveEntityPicture =
    typeof liveAttrs?.entity_picture === 'string'
      ? (liveAttrs.entity_picture as string)
      : entityPicture;

  const cardColors = liveState === 'home' ? colors.person.home : colors.person.away;
  const surface = getPersonCardSurfaceTokens(theme, liveState);
  const resolvedEntityPicture = liveEntityPicture?.startsWith('/')
    ? `${config?.url ?? ''}${liveEntityPicture}`
    : liveEntityPicture;

  return (
    <div
      className={`relative h-full bg-gradient-to-br ${cardColors.gradient} ${cardShell.backdropClassName} rounded-3xl ${padding} ${theme !== 'dark' ? 'border' : ''} ${cardColors.border} overflow-hidden ${surface.containerShadowClassName}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${cardColors.glow} to-transparent`}></div>

      {/* Light theme frosted overlay */}
      {surface.overlayClassName && (
        <div className={`absolute inset-0 ${surface.overlayClassName}`} />
      )}

      <div className="relative h-full flex flex-col">
        <EntityCardHeader
          title={name}
          subtitle={t('deviceType.person')}
          size={size}
          titleClassName={surface.titleClassName}
          subtitleClassName={surface.typeLabelClassName}
          className="mb-2"
        />

        {!isSmall && (
          <p className={`mb-2 text-xs ${surface.locationClassName}`}>
            {liveState === 'home' ? room : liveLocation}
          </p>
        )}

        <div className="flex-1 flex flex-col items-center justify-center">
          <div
            className={`${isSmall ? 'w-10 h-10' : 'w-14 h-14'} rounded-full flex items-center justify-center mb-2 ${
              liveState === 'home'
                ? 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/50'
                : surface.avatarAwayBgClassName
            }`}
          >
            {resolvedEntityPicture ? (
              <ImageWithFallback
                src={resolvedEntityPicture}
                alt={name}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <User
                className={`${isSmall ? 'w-5 h-5' : 'w-7 h-7'} ${surface.avatarIconClassName}`}
              />
            )}
          </div>

          {!isSmall && (
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${surface.statusPillClassName}`}
            >
              {liveState === 'home' ? (
                <>
                  <Home className={`h-3 w-3 ${surface.homeIconClassName}`} />
                  <span className={`text-xs font-medium ${surface.statusLabelClassName}`}>
                    {t('person.home')}
                  </span>
                </>
              ) : (
                <>
                  <MapPin className={`h-3 w-3 ${surface.awayIconClassName}`} />
                  <span className={`text-xs ${surface.statusLabelClassName}`}>
                    {t('person.away')}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
