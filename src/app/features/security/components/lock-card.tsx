import { Lock, Unlock } from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import {
  type CardSize,
  isExtraSmallCardSize,
  isTinyCardSize,
} from '@/app/components/shared/card-size-selector';
import { EntityCardHeader } from '@/app/components/shared/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/shared/entity-card-header-icon';
import { RoundControlButton } from '@/app/components/shared/round-control-button';
import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { TinyActionCard } from '@/app/components/shared/tiny-action-card';
import { TinyCardWatermark } from '@/app/components/shared/tiny-card-watermark';
import { useHomeAssistant, useI18n, useTheme } from '@/app/hooks';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { getSecurityCardSurfaceTokens } from './security-card-surface-tokens';

interface LockCardProps {
  id: string;
  name: string;
  room: string;
  initialState?: boolean; // true = locked, false = unlocked
  size?: CardSize;
}

export const LockCard = memo(function LockCard({
  id,
  name,
  initialState = true,
  size = 'small',
}: Omit<LockCardProps, 'room'>) {
  const [isLocked, setIsLocked] = useState(initialState);
  const liveEntity = useHomeAssistant(homeAssistantSelectors.entity(id));
  const { t } = useI18n();

  useEffect(() => {
    if (liveEntity) {
      setIsLocked(liveEntity.state === 'locked');
      return;
    }
    setIsLocked(initialState);
  }, [liveEntity, initialState]);
  const { theme, colors, accentColor } = useTheme();
  const cardShell = getCardShellSurfaceTokens(theme);
  const securitySurface = getSecurityCardSurfaceTokens(theme);
  const isTiny = isTinyCardSize(size);
  const isExtraSmall = isExtraSmallCardSize(size);

  const cardColors = isLocked ? colors.lock.locked : colors.lock.unlocked;
  const statusTextClassName =
    theme === 'light'
      ? isLocked
        ? 'text-green-700'
        : 'text-red-700'
      : theme === 'glass'
        ? isLocked
          ? 'text-green-100'
          : 'text-red-100'
        : isLocked
          ? 'text-green-300'
          : 'text-red-300';
  const tinyTextTokens = getCardReadableTextTokens({
    theme,
    tone: isLocked ? 'primary' : 'red',
    accentColor,
  });

  if (isTiny) {
    return (
      <TinyActionCard
        rootClassName={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[26px] bg-linear-to-br px-3 py-2.5 ${theme !== 'dark' ? 'border' : ''} ${cardShell.backdropClassName} transition-all duration-500 ${cardColors.gradient} ${cardColors.border} ${securitySurface.containerShadowClassName}`}
        metadata={t('security.lock')}
        title={name}
        detail={isLocked ? t('security.locked') : t('security.unlocked')}
        metadataClassName="text-white/70"
        titleClassName="text-white"
        detailClassName={statusTextClassName}
        metadataStyle={{ color: tinyTextTokens.subtitleColor }}
        titleStyle={{ color: tinyTextTokens.titleColor }}
        watermark={
          isLocked ? (
            <TinyCardWatermark
              IconComponent={Lock}
              color={tinyTextTokens.titleColor}
              className="opacity-15"
            />
          ) : (
            <TinyCardWatermark
              IconComponent={Unlock}
              color={tinyTextTokens.titleColor}
              className="opacity-15"
            />
          )
        }
        overlays={
          <>
            <div
              className={`absolute inset-0 bg-linear-to-br ${cardColors.glow} to-transparent transition-all duration-500`}
            />
            {securitySurface.overlayClassName ? (
              <div className={`absolute inset-0 ${securitySurface.overlayClassName}`} />
            ) : null}
          </>
        }
        actionButtonProps={{
          onClick: () => setIsLocked(!isLocked),
          'aria-label': isLocked ? t('security.unlocked') : t('security.locked'),
        }}
      />
    );
  }

  if (isExtraSmall) {
    return (
      <div
        className={`relative h-full overflow-hidden rounded-3xl bg-linear-to-br px-3 py-2.5 ${theme !== 'dark' ? 'border' : ''} ${cardShell.backdropClassName} transition-all duration-500 ${cardColors.gradient} ${cardColors.border} ${securitySurface.containerShadowClassName}`}
      >
        <div
          className={`absolute inset-0 bg-linear-to-r ${cardColors.glow} via-transparent to-transparent transition-all duration-500`}
        />

        {securitySurface.overlayClassName ? (
          <div className={`absolute inset-0 ${securitySurface.overlayClassName}`} />
        ) : null}

        <EntityCardHeader
          title={name}
          subtitle={isLocked ? t('security.locked') : t('security.unlocked')}
          size="extra-small"
          align="center"
          tone={isLocked ? 'primary' : 'red'}
          titleClassName="text-white"
          subtitleClassName={statusTextClassName}
          className="h-full"
          contentClassName="justify-center"
          marginBottomClassName="mb-0"
          leading={
            <EntityCardHeaderIcon
              IconComponent={isLocked ? Lock : Unlock}
              isActive={isLocked}
              size="small"
              tone={isLocked ? 'primary' : 'red'}
            />
          }
          trailing={
            <RoundControlButton
              theme={theme}
              size="extra-small"
              variant="emphasis"
              onClick={() => setIsLocked(!isLocked)}
              className={`h-9 w-9 ${
                isLocked
                  ? 'bg-linear-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/35'
                  : 'bg-linear-to-br from-red-400 to-red-600 shadow-lg shadow-red-500/35'
              }`}
            >
              {isLocked ? (
                <Lock className="h-4.5 w-4.5 text-white" />
              ) : (
                <Unlock className="h-4.5 w-4.5 text-white" />
              )}
            </RoundControlButton>
          }
        />
      </div>
    );
  }

  return (
    <div
      className={`relative h-full overflow-hidden rounded-3xl bg-linear-to-br ${isExtraSmall ? 'p-3' : 'p-4'} ${theme !== 'dark' ? 'border' : ''} ${cardShell.backdropClassName} transition-all duration-500 ${cardColors.gradient} ${cardColors.border} ${securitySurface.containerShadowClassName}`}
    >
      <div
        className={`absolute inset-0 bg-linear-to-br ${cardColors.glow} to-transparent transition-all duration-500`}
      ></div>

      {/* Light theme frosted overlay */}
      {securitySurface.overlayClassName && (
        <div className={`absolute inset-0 ${securitySurface.overlayClassName}`} />
      )}

      <div className="relative h-full flex flex-col">
        <EntityCardHeader
          title={name}
          subtitle={t('security.lock')}
          layout="eyebrow-first"
          size={size}
          tone={isLocked ? 'primary' : 'red'}
          leading={
            <EntityCardHeaderIcon
              IconComponent={isLocked ? Lock : Unlock}
              isActive={isLocked}
              size={size}
              tone={isLocked ? 'primary' : 'red'}
            />
          }
        />

        <div className="flex-1 flex flex-col items-center justify-center">
          <RoundControlButton
            theme={theme}
            size={isExtraSmall ? 'extra-small' : 'large'}
            variant="emphasis"
            onClick={() => setIsLocked(!isLocked)}
            className={`${isExtraSmall ? 'h-10 w-10' : 'h-12 w-12'} transition-all duration-500 hover:scale-105 ${
              isLocked
                ? 'bg-linear-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/50'
                : 'bg-linear-to-br from-red-400 to-red-600 shadow-lg shadow-red-500/50'
            }`}
          >
            {isLocked ? (
              <Lock className={`${isExtraSmall ? 'h-5 w-5' : 'h-6 w-6'} text-white`} />
            ) : (
              <Unlock className={`${isExtraSmall ? 'h-5 w-5' : 'h-6 w-6'} text-white`} />
            )}
          </RoundControlButton>

          <div className={`text-center ${isExtraSmall ? 'mt-2' : 'mt-3'}`}>
            <div
              className={`${isExtraSmall ? 'text-[11px]' : 'text-xs'} ${statusTextClassName} transition-colors duration-500`}
            >
              {isLocked ? t('security.locked') : t('security.unlocked')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
