import { CarFront, Check, Loader2, Lock, Unlock } from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import {
  BaseCard,
  EntityCardHeader,
  EntityCardHeaderIcon,
  SlideAction,
} from '@/app/components/primitives';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import {
  getCardReadableTextTokens,
  resolveCardToneBaseColor,
} from '@/app/components/shared/theme/card-readable-text-tokens';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getCardStateSurfaceStyleTokens } from '@/app/components/shared/theme/card-state-surface-tokens';
import { getEntityIconPillStyles } from '@/app/components/shared/theme/entity-icon-pill-styles';
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
  const [pendingTargetLocked, setPendingTargetLocked] = useState<boolean | null>(null);
  const [isPendingAction, setIsPendingAction] = useState(false);
  const liveEntity = useHomeAssistant(homeAssistantSelectors.entity(id));
  const { t } = useI18n();
  const runAction = useServiceActionHandler();

  useEffect(() => {
    if (liveEntity) {
      if (liveEntity.state !== 'locked' && liveEntity.state !== 'unlocked') {
        return;
      }

      const nextIsLocked = liveEntity.state === 'locked';
      setIsLocked(nextIsLocked);
      if (pendingTargetLocked === nextIsLocked) {
        setPendingTargetLocked(null);
        setIsPendingAction(false);
      }
      return;
    }

    setIsLocked(initialState);
    setPendingTargetLocked(null);
    setIsPendingAction(false);
  }, [liveEntity, initialState, pendingTargetLocked]);

  const { theme, colors } = useTheme();
  const cardShell = getCardShellSurfaceTokens(theme);
  const securitySurface = getSecurityCardSurfaceTokens(theme);
  const liveAttributes = liveEntity?.attributes as Record<string, unknown> | undefined;
  const resolvedSize = resolveLockCardSize(size);
  const isVehicleLock = isVehicleLockEntity(id, name, liveAttributes);
  const displayIsLocked = pendingTargetLocked ?? isLocked;
  const IconComponent = isVehicleLock ? CarFront : displayIsLocked ? Lock : Unlock;
  const pendingLabel =
    pendingTargetLocked === null
      ? null
      : pendingTargetLocked
        ? t('security.locking')
        : t('security.unlocking');
  const statusLabel =
    pendingLabel ?? (displayIsLocked ? t('security.locked') : t('security.unlocked'));
  const swipeLabel = isLocked ? t('security.slideToUnlock') : t('security.slideToLock');
  const cardColors = displayIsLocked ? colors.lock.locked : colors.lock.unlocked;
  const stateIconClassName =
    theme === 'light'
      ? displayIsLocked
        ? 'text-green-700'
        : 'text-red-700'
      : theme === 'glass'
        ? displayIsLocked
          ? 'text-green-100'
          : 'text-red-100'
        : displayIsLocked
          ? 'text-green-300'
          : 'text-red-300';
  const headerTone = displayIsLocked ? 'green' : 'red';
  const activeBaseColor = resolveCardToneBaseColor({ tone: headerTone });
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

    const nextLocked = !isLocked;
    const nextState: 'locked' | 'unlocked' = nextLocked ? 'locked' : 'unlocked';
    setPendingTargetLocked(nextLocked);
    setIsPendingAction(true);

    void runAction(
      async () => {
        await homeAssistantService.updateLock(id, nextState);
        if (!liveEntity) {
          setIsLocked(nextLocked);
          setPendingTargetLocked(null);
          setIsPendingAction(false);
        }
      },
      t('security.feedback.updateLockFailed'),
      {
        onError: () => {
          setPendingTargetLocked(null);
          setIsPendingAction(false);
        },
      }
    ).finally(() => {
      if (!liveEntity) {
        setIsPendingAction(false);
      }
    });
  };

  const topNameClassName = `${securitySurface.primaryTextClassName} truncate font-semibold tracking-[-0.02em]`;
  const overlayTintClassName = securitySurface.lockCardOverlay;
  const heroPlateClassName =
    theme === 'light'
      ? 'border-black/8 bg-white/56 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.36)]'
      : 'border-white/10 bg-black/18 shadow-[0_18px_36px_-24px_rgba(0,0,0,0.66)]';
  const headerLeading = (
    <EntityCardHeaderIcon
      IconComponent={IconComponent}
      isActive
      size={resolvedSize}
      tone={headerTone}
      baseColor={activeBaseColor}
    />
  );
  const headerTitleClassName = displayIsLocked
    ? `${securitySurface.primaryTextClassName} tracking-[-0.02em]`
    : `${securitySurface.lockStatusText} tracking-[-0.02em]`;
  const headerSubtitleClassName = displayIsLocked
    ? stateIconClassName
    : `${securitySurface.lockStatusSubtext} font-semibold uppercase tracking-[0.16em]`;
  const slideThumbTokens = getEntityIconPillStyles({
    isActive: true,
    isInteractive: false,
    primaryColor: 'custom',
    baseColor: activeBaseColor,
    size: resolvedSize,
    theme,
    tone: headerTone,
  });
  const slideLabelTokens = getCardReadableTextTokens({
    theme,
    tone: headerTone,
    baseColor: activeBaseColor,
  });

  return (
    <BaseCard
      size="small"
      className={`${isPendingAction ? 'opacity-80' : ''}`}
      frameClassName={`${cardShell.rootFrameClassName} bg-linear-to-br ${cardColors.gradient} ${cardColors.border} ${securitySurface.containerShadowClassName}`}
      style={displayIsLocked && blackActiveSurface ? blackActiveSurface.cardStyle : undefined}
      disableDefaultSheen
      overlay={
        <>
          <div
            className={`absolute inset-0 bg-linear-to-b ${cardColors.glow} via-transparent to-transparent transition-all duration-500`}
          />
          {displayIsLocked && blackActiveSurface?.innerOverlayClassName ? (
            <div
              className={blackActiveSurface.innerOverlayClassName}
              style={blackActiveSurface.innerOverlayStyle}
            />
          ) : null}
          <div className={`absolute inset-0 ${overlayTintClassName}`} />
          {displayIsLocked && blackActiveSurface?.shineOverlayClassName ? (
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
            <div className={`absolute inset-[14px] rounded-full ${securitySurface.lockButtonBg}`} />
            {isPendingAction ? (
              <Loader2 className={`relative h-6.5 w-6.5 animate-spin ${stateIconClassName}`} />
            ) : (
              <IconComponent className={`relative h-6.5 w-6.5 ${stateIconClassName}`} />
            )}
          </div>
        </div>

        <div className="mt-auto pt-1.5">
          <SlideAction
            actionLabel={swipeLabel}
            ariaLabel={swipeLabel}
            completionIcon={Check}
            disabled={isEditMode || isPendingAction}
            labelStyle={{ color: slideLabelTokens.titleColor }}
            onComplete={handleToggleLock}
            size="small"
            theme={theme}
            thumbClassName={slideThumbTokens.badgeClassName}
            thumbIconClassName={slideThumbTokens.iconClassName}
            thumbIconStyle={slideThumbTokens.iconStyle}
            thumbStyle={slideThumbTokens.badgeStyle}
          />
        </div>
      </div>
    </BaseCard>
  );
});
