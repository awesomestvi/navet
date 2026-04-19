import { CarFront, Lock, Unlock } from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import { SlideAction } from '@/app/components/primitives';
import { EntityCardTitleBlock } from '@/app/components/primitives/entity-card-title-block';
import {
  type CardSize,
  isExtraSmallCardSize,
  isTinyCardSize,
} from '@/app/components/shared/card-size-selector';
import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getCardStateSurfaceStyleTokens } from '@/app/components/shared/theme/card-state-surface-tokens';
import { TinyCardWatermark } from '@/app/components/shared/tiny-card-watermark';
import { useHomeAssistant, useI18n, useServiceActionHandler, useTheme } from '@/app/hooks';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { getSecurityCardSurfaceTokens } from './security-card-surface-tokens';

interface LockCardProps {
  id: string;
  name: string;
  room: string;
  initialState?: boolean; // true = locked, false = unlocked
  size?: CardSize;
  isEditMode?: boolean;
}

const LOCK_CARD_ALLOWED_SIZES: CardSize[] = ['tiny', 'extra-small', 'small'];

function resolveLockCardSize(size: CardSize): Extract<CardSize, 'tiny' | 'extra-small' | 'small'> {
  if (LOCK_CARD_ALLOWED_SIZES.includes(size)) {
    return size as Extract<CardSize, 'tiny' | 'extra-small' | 'small'>;
  }

  return 'small';
}

function isVehicleLockEntity(
  entityId: string,
  name: string,
  attributes: Record<string, unknown> | undefined
) {
  const haystack = `${entityId} ${name} ${String(attributes?.device_class ?? '')}`.toLowerCase();

  return [
    'car',
    'vehicle',
    'tesla',
    'volvo',
    'bmw',
    'audi',
    'mercedes',
    'trunk',
    'boot',
    'frunk',
  ].some((token) => haystack.includes(token));
}

export const LockCard = memo(function LockCard({
  id,
  name,
  initialState = true,
  size = 'small',
  isEditMode = false,
}: Omit<LockCardProps, 'room'>) {
  const [isLocked, setIsLocked] = useState(initialState);
  const [isPendingAction, setIsPendingAction] = useState(false);
  const liveEntity = useHomeAssistant(homeAssistantSelectors.entity(id));
  const { t } = useI18n();
  const runAction = useServiceActionHandler();

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
  const liveAttributes = liveEntity?.attributes as Record<string, unknown> | undefined;
  const resolvedSize = resolveLockCardSize(size);
  const isTiny = isTinyCardSize(resolvedSize);
  const isExtraSmall = isExtraSmallCardSize(resolvedSize);
  const isVehicleLock = isVehicleLockEntity(id, name, liveAttributes);
  const IconComponent = isVehicleLock ? CarFront : isLocked ? Lock : Unlock;
  const completionIcon = isVehicleLock ? CarFront : isLocked ? Unlock : Lock;
  const statusLabel = isLocked ? t('security.locked') : t('security.unlocked');
  const nextActionLabel = isLocked ? t('security.action.unlock') : t('security.action.lock');
  const swipeLabel = isLocked ? t('security.slideToUnlock') : t('security.slideToLock');
  const cardColors = isLocked ? colors.lock.locked : colors.lock.unlocked;
  const stateIconClassName =
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
  const activeBaseColor = isLocked ? accentColor : '#ef4444';
  const blackActiveSurface =
    theme === 'black'
      ? getCardStateSurfaceStyleTokens({
          theme,
          isActive: true,
          baseColor: activeBaseColor,
          borderAlphaHex: '47',
        })
      : null;

  const handleToggleLock = () => {
    if (isPendingAction) {
      return;
    }

    const nextState: 'locked' | 'unlocked' = isLocked ? 'unlocked' : 'locked';
    setIsPendingAction(true);

    void runAction(async () => {
      await homeAssistantService.updateLock(id, nextState);
    }, t('security.feedback.updateLockFailed')).finally(() => {
      setIsPendingAction(false);
    });
  };

  if (isTiny) {
    return (
      <div
        className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[26px] bg-linear-to-br px-3 py-2.5 ${theme !== 'dark' ? 'border' : ''} ${cardShell.backdropClassName} transition-all duration-500 ${cardColors.gradient} ${cardColors.border} ${securitySurface.containerShadowClassName} ${isPendingAction ? 'opacity-80' : ''}`}
        style={isLocked && blackActiveSurface ? blackActiveSurface.cardStyle : undefined}
      >
        <div
          className={`absolute inset-0 bg-linear-to-br ${cardColors.glow} to-transparent transition-all duration-500`}
        />
        {isLocked && blackActiveSurface?.innerOverlayClassName ? (
          <div
            className={blackActiveSurface.innerOverlayClassName}
            style={blackActiveSurface.innerOverlayStyle}
          />
        ) : null}
        {securitySurface.overlayClassName ? (
          <div className={`absolute inset-0 ${securitySurface.overlayClassName}`} />
        ) : null}
        {isLocked && blackActiveSurface?.shineOverlayClassName ? (
          <div className={blackActiveSurface.shineOverlayClassName} />
        ) : null}
        <TinyCardWatermark
          IconComponent={IconComponent}
          color={tinyTextTokens.titleColor}
          className={isPendingAction ? 'opacity-22' : 'opacity-14'}
        />

        <div className="relative flex h-full w-full flex-col justify-between text-left">
          <div className="min-w-0 w-full pt-1">
            <EntityCardTitleBlock
              title={name}
              subtitle={statusLabel}
              layout="eyebrow-first"
              titleClassName="mt-0.5 line-clamp-2 text-[10px] font-semibold leading-tight"
              subtitleClassName={`truncate text-[10px] font-medium tracking-normal ${stateIconClassName}`}
              titleStyle={{ color: tinyTextTokens.titleColor }}
              subtitleStyle={{ color: tinyTextTokens.subtitleColor }}
            />
          </div>
          <span />
        </div>

        {!isEditMode && !isPendingAction ? (
          <button
            type="button"
            className="absolute inset-0"
            onClick={handleToggleLock}
            aria-label={nextActionLabel}
          />
        ) : null}
      </div>
    );
  }

  const compactRootClassName = `relative h-full overflow-hidden rounded-3xl bg-linear-to-br ${theme !== 'dark' ? 'border' : ''} ${cardShell.backdropClassName} transition-all duration-500 ${cardColors.gradient} ${cardColors.border} ${securitySurface.containerShadowClassName} ${isPendingAction ? 'opacity-80' : ''}`;
  const topNameClassName = `${securitySurface.primaryTextClassName} truncate font-semibold tracking-[-0.02em]`;
  const overlayTintClassName =
    theme === 'light' ? 'bg-white/22' : theme === 'glass' ? 'bg-white/[0.03]' : 'bg-black/10';
  const heroPlateClassName =
    theme === 'light'
      ? 'border-black/8 bg-white/56 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.36)]'
      : 'border-white/10 bg-black/18 shadow-[0_18px_36px_-24px_rgba(0,0,0,0.66)]';

  if (isExtraSmall) {
    return (
      <div
        className={`${compactRootClassName} px-3 py-3`}
        style={isLocked && blackActiveSurface ? blackActiveSurface.cardStyle : undefined}
      >
        <div
          className={`absolute inset-0 bg-linear-to-br ${cardColors.glow} via-transparent to-transparent transition-all duration-500`}
        />
        {isLocked && blackActiveSurface?.innerOverlayClassName ? (
          <div
            className={blackActiveSurface.innerOverlayClassName}
            style={blackActiveSurface.innerOverlayStyle}
          />
        ) : null}
        <div className={`absolute inset-0 ${overlayTintClassName}`} />
        {isLocked && blackActiveSurface?.shineOverlayClassName ? (
          <div className={blackActiveSurface.shineOverlayClassName} />
        ) : null}

        <div className="relative flex h-full flex-col justify-between gap-3">
          <p className={`${topNameClassName} text-[12px]`}>{name}</p>

          <SlideAction
            actionLabel={swipeLabel}
            ariaLabel={swipeLabel}
            completionIcon={completionIcon}
            disabled={isEditMode || isPendingAction}
            onComplete={handleToggleLock}
            size="extra-small"
            theme={theme}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${compactRootClassName} p-3`}
      style={isLocked && blackActiveSurface ? blackActiveSurface.cardStyle : undefined}
    >
      <div
        className={`absolute inset-0 bg-linear-to-b ${cardColors.glow} via-transparent to-transparent transition-all duration-500`}
      />
      {isLocked && blackActiveSurface?.innerOverlayClassName ? (
        <div
          className={blackActiveSurface.innerOverlayClassName}
          style={blackActiveSurface.innerOverlayStyle}
        />
      ) : null}
      <div className={`absolute inset-0 ${overlayTintClassName}`} />
      {isLocked && blackActiveSurface?.shineOverlayClassName ? (
        <div className={blackActiveSurface.shineOverlayClassName} />
      ) : null}

      <div className="relative flex h-full flex-col">
        <div className="flex flex-col items-center gap-0.5 text-center">
          <p className={`${topNameClassName} max-w-full text-[15px] leading-tight`}>{name}</p>
          <p className={`text-[9px] font-medium uppercase tracking-[0.22em] ${stateIconClassName}`}>
            {statusLabel}
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center py-1.5">
          <div
            className={`relative flex h-16 w-16 items-center justify-center rounded-full border ${heroPlateClassName}`}
          >
            <div
              className={`absolute inset-0 rounded-full bg-linear-to-br ${cardColors.glow} to-transparent`}
            />
            <div className="absolute inset-[8px] rounded-full border border-white/10" />
            <div
              className={`absolute inset-[14px] rounded-full ${
                theme === 'light' ? 'bg-white/65' : 'bg-white/6'
              }`}
            />
            <IconComponent className={`relative h-6.5 w-6.5 ${stateIconClassName}`} />
          </div>
        </div>

        <div className="mt-auto pt-1">
          <SlideAction
            actionLabel={swipeLabel}
            ariaLabel={swipeLabel}
            completionIcon={completionIcon}
            disabled={isEditMode || isPendingAction}
            onComplete={handleToggleLock}
            size="small"
            theme={theme}
          />
        </div>
      </div>
    </div>
  );
});
