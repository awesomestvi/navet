import { CarFront, Lock, Unlock } from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import {
  BaseCard,
  EntityCardHeader,
  EntityCardHeaderIcon,
  SlideAction,
} from '@/app/components/primitives';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getCardStateSurfaceStyleTokens } from '@/app/components/shared/theme/card-state-surface-tokens';
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

function resolveLockCardSize(_size: CardSize): 'small' {
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
  const isVehicleLock = isVehicleLockEntity(id, name, liveAttributes);
  const IconComponent = isVehicleLock ? CarFront : isLocked ? Lock : Unlock;
  const completionIcon = isVehicleLock ? CarFront : isLocked ? Unlock : Lock;
  const statusLabel = isLocked ? t('security.locked') : t('security.unlocked');
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

  const topNameClassName = `${securitySurface.primaryTextClassName} truncate font-semibold tracking-[-0.02em]`;
  const overlayTintClassName =
    theme === 'light' ? 'bg-white/22' : theme === 'glass' ? 'bg-white/[0.03]' : 'bg-black/10';
  const heroPlateClassName =
    theme === 'light'
      ? 'border-black/8 bg-white/56 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.36)]'
      : 'border-white/10 bg-black/18 shadow-[0_18px_36px_-24px_rgba(0,0,0,0.66)]';
  const headerTone = isLocked ? 'primary' : 'red';
  const headerLeading = (
    <EntityCardHeaderIcon
      IconComponent={IconComponent}
      isActive
      size={resolvedSize}
      tone={headerTone}
      baseColor={activeBaseColor}
    />
  );
  const headerTitleClassName = isLocked
    ? `${securitySurface.primaryTextClassName} tracking-[-0.02em]`
    : `${theme === 'light' ? 'text-red-950' : 'text-white'} tracking-[-0.02em]`;
  const headerSubtitleClassName = isLocked
    ? stateIconClassName
    : `${theme === 'light' ? 'text-red-700' : 'text-red-200'} font-semibold uppercase tracking-[0.16em]`;

  return (
    <BaseCard
      size="small"
      className={`${isPendingAction ? 'opacity-80' : ''}`}
      frameClassName={`${cardShell.rootFrameClassName} bg-linear-to-br ${cardColors.gradient} ${cardColors.border} ${securitySurface.containerShadowClassName}`}
      style={isLocked && blackActiveSurface ? blackActiveSurface.cardStyle : undefined}
      disableDefaultSheen
      overlay={
        <>
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
        </>
      }
    >
      <div className="relative flex h-full min-h-0 flex-col">
        <EntityCardHeader
          title={name}
          subtitle={statusLabel}
          layout="eyebrow-first"
          size="small"
          tone={headerTone}
          accentColor={activeBaseColor}
          leading={headerLeading}
          titleClassName={`${topNameClassName} ${headerTitleClassName}`}
          subtitleClassName={headerSubtitleClassName}
          className="mb-1.5"
        />

        <div className="flex min-h-0 flex-1 items-center justify-center pt-2 pb-4">
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

        <div className="mt-auto pt-1.5">
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
    </BaseCard>
  );
});
