import { EyeOff, Lock, Unlock, X } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import { lazy, memo, Suspense } from 'react';
import { CardEditActionButton } from '@/app/components/shared/card-edit-action-button';
import { type CardSize, getCardSpanClass } from '@/app/components/shared/card-size-selector';
import { getBaseCardRadiusClassName } from '@/app/components/system/tokens';
import { useI18n } from '@/app/hooks';
import { settingsSelectors } from '@/app/stores/selectors';
import { useSettingsStore } from '@/app/stores/settings-store';
import type { DeviceWithType } from '@/app/types/device.types';
import type { CustomCard } from '../stores/custom-cards-store';
import { useDashboardEntitiesStore } from '../stores/dashboard-entities-store';
import { renderCard } from '../utils/card-renderer';
import type { ZoneName } from '../zones/zone-types';
import { DashboardResizeTrigger } from './dashboard-edit-actions';
import { WidgetCard } from './widget-card';

interface DashboardCardItemProps {
  id: string;
  size: CardSize;
  isEditMode: boolean;
  handleSizeChange: (id: string, size: CardSize) => void;
  device?: DeviceWithType;
  card?: CustomCard;
  zone?: ZoneName;
  onDeleteCard?: (cardId: string) => void;
  onUpdateCard?: (cardId: string, data: Record<string, unknown>) => void;
  onRemoveFromLayout?: (cardId: string) => void;
  onRemoveEntity?: (entityId: string) => void;
  allowEntityRemoval?: boolean;
  allowExtraLargeSizes?: boolean;
  usesHideAction?: boolean;
}

const DashboardCardItemDraggable = lazy(async () => {
  const module = await import('./dashboard-card-item-draggable');
  return { default: module.DashboardCardItemDraggable };
});

export const DashboardCardItem = memo(function DashboardCardItem({
  id,
  size,
  isEditMode,
  handleSizeChange,
  device,
  card,
  zone,
  onDeleteCard,
  onUpdateCard,
  onRemoveFromLayout,
  onRemoveEntity,
  allowEntityRemoval = false,
  allowExtraLargeSizes = zone === 'hero' || zone === undefined,
  usesHideAction = false,
}: DashboardCardItemProps) {
  const { t } = useI18n();
  const ambientLightBleed = useSettingsStore(settingsSelectors.ambientLightBleed);
  const isLocked = useDashboardEntitiesStore((state) => state.lockedCardIds.includes(id));
  const toggleCardLock = useDashboardEntitiesStore((state) => state.toggleCardLock);
  const RemoveActionIcon = usesHideAction ? EyeOff : X;
  const removeAriaLabel = t('dashboard.edit.removeEntityFromDashboard');
  const allowedSizes = getAllowedSizes(device, card, allowExtraLargeSizes);
  const resolvedSize = resolveAllowedSize(size, allowedSizes);
  const spanClass = getCardSpanClass(resolvedSize);
  const editControlSize =
    device?.type === 'media' && resolvedSize === 'medium-vertical' ? 'medium' : resolvedSize;

  // Drag is only enabled in edit mode when the card is inside a zone band.
  const draggable = isEditMode && zone !== undefined;
  const isInteractionLocked = isLocked && !isEditMode;
  const LockActionIcon = isLocked ? Lock : Unlock;
  const lockAriaLabel = isLocked ? t('dashboard.edit.unlockCard') : t('dashboard.edit.lockCard');
  const handleLockToggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    toggleCardLock(id);
  };
  const renderedCard = device ? (
    renderCard({ device, size: resolvedSize, handleSizeChange, isEditMode })
  ) : card ? (
    <WidgetCard
      card={{ ...card, size: resolvedSize }}
      isEditMode={isEditMode}
      onUpdate={onUpdateCard}
    />
  ) : null;
  const lockedCardContent = (
    <LockedCardInteractionFrame
      isLocked={isInteractionLocked}
      label={t('dashboard.edit.lockedCard')}
    >
      {renderedCard}
    </LockedCardInteractionFrame>
  );

  const cardContent = (
    <>
      {isEditMode ? <EditModeCardBackdrop size={resolvedSize} /> : null}
      {isEditMode && !onRemoveFromLayout && device && allowEntityRemoval && onRemoveEntity && (
        <CardEditActionButton
          cardSize={editControlSize}
          Icon={RemoveActionIcon}
          placement="top-left"
          variant={usesHideAction ? 'neutral' : 'destructive'}
          data-dashboard-edit-action="remove-entity"
          data-card-id={id}
          aria-label={removeAriaLabel}
        />
      )}
      {isEditMode && onRemoveFromLayout ? (
        <CardEditActionButton
          cardSize={editControlSize}
          Icon={X}
          placement="top-left"
          variant="neutral"
          data-dashboard-edit-action="remove-layout"
          data-card-id={id}
          aria-label={t('dashboard.edit.removeFromHome')}
        />
      ) : null}
      {isEditMode && !onRemoveFromLayout && !device && card && onDeleteCard && (
        <CardEditActionButton
          cardSize={editControlSize}
          Icon={X}
          placement="top-left"
          variant="destructive"
          data-dashboard-edit-action="delete-card"
          data-card-id={id}
          aria-label={t('widgets.delete')}
        />
      )}
      {isEditMode ? (
        <CardEditActionButton
          cardSize={editControlSize}
          Icon={LockActionIcon}
          placement="bottom-right"
          variant="neutral"
          className={
            isLocked
              ? 'border-white/18 bg-black/78 text-white ring-1 ring-black/35 hover:bg-black/82'
              : ''
          }
          aria-pressed={isLocked}
          aria-label={lockAriaLabel}
          title={lockAriaLabel}
          onClick={handleLockToggle}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
        />
      ) : null}
      {isEditMode ? (
        <DashboardResizeTrigger
          cardSize={resolvedSize}
          triggerSize={editControlSize}
          allowedSizes={allowedSizes}
          onSizeChange={(nextSize) => handleSizeChange(id, nextSize)}
        />
      ) : null}
      {isLocked && !isEditMode ? <LockedCardBadge label={t('dashboard.edit.lockedCard')} /> : null}
      {lockedCardContent}
    </>
  );

  const containerClassName = `relative h-full ${
    device?.type === 'lights' && ambientLightBleed
      ? '[contain:layout_style]'
      : '[contain:layout_style_paint]'
  } ${spanClass} [&>*]:cursor-inherit`;

  if (draggable && zone) {
    return (
      <Suspense
        fallback={
          <div className={`${containerClassName} touch-none cursor-grab active:cursor-grabbing`}>
            {cardContent}
          </div>
        }
      >
        <DashboardCardItemDraggable
          id={id}
          zone={zone}
          spanClass={spanClass}
          ambientLightBleed={device?.type === 'lights' && ambientLightBleed}
        >
          {cardContent}
        </DashboardCardItemDraggable>
      </Suspense>
    );
  }

  return (
    <div className={`${containerClassName} cursor-inherit`} data-card-nodrag="true">
      {cardContent}
    </div>
  );
}, areDashboardCardItemPropsEqual);

function EditModeCardBackdrop({ size }: { size: CardSize }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-300 ${getBaseCardRadiusClassName(size)} bg-[radial-gradient(circle_at_top_left,rgba(0,0,0,0.42),transparent_52%),radial-gradient(circle_at_top_right,rgba(0,0,0,0.46),transparent_48%),linear-gradient(to_bottom,rgba(0,0,0,0.22),transparent_34%,transparent_58%,rgba(0,0,0,0.34))]`}
      aria-hidden="true"
    />
  );
}

function LockedCardBadge({ label }: { label: string }) {
  return (
    <div
      className="pointer-events-none absolute right-3 bottom-3 z-400 flex h-8 w-8 items-center justify-center rounded-full border border-white/18 bg-black/78 text-white shadow-[0_12px_26px_-14px_rgba(0,0,0,0.95)] ring-1 ring-black/35 backdrop-blur-xl"
      aria-label={label}
      role="img"
      title={label}
    >
      <Lock className="h-4 w-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]" aria-hidden="true" />
    </div>
  );
}

function LockedCardInteractionFrame({
  children,
  isLocked,
  label,
}: {
  children: ReactNode;
  isLocked: boolean;
  label: string;
}) {
  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative h-full w-full" data-card-locked="true">
      <div inert className="h-full w-full">
        {children}
      </div>
      <button
        type="button"
        className="absolute inset-0 z-300 cursor-not-allowed rounded-[inherit] border-0 bg-transparent p-0"
        data-card-lock-overlay="true"
        aria-label={label}
        tabIndex={-1}
        title={label}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      />
    </div>
  );
}

function getAllowedSizes(
  device?: DeviceWithType,
  card?: CustomCard,
  extraLargeAllowed = true
): CardSize[] {
  if (card) {
    if (extraLargeAllowed && (card.type === 'photo' || card.type === 'rss')) {
      return ['small', 'medium', 'large', 'extra-large'];
    }
    if (card.type === 'energy-now') {
      return ['small', 'medium', 'large'];
    }
    if (card.type === 'map') {
      return ['small', 'medium', 'large'];
    }
    return ['small', 'medium', 'large'];
  }

  switch (device?.type) {
    case 'cameras':
      return ['medium', 'large', 'extra-large'];
    case 'media':
      return ['small', 'medium', 'medium-vertical', 'large'];
    case 'grouped-sensors':
      return ['small', 'medium'];
    case 'hvac':
    case 'climate':
      return ['small', 'medium'];
    case 'calendars':
      return ['small', 'medium', 'large'];
    case 'weather':
      return ['small', 'medium', 'large'];
    case 'vacuums':
      return ['small', 'medium'];
    case 'switches':
      return ['tiny', 'extra-small', 'small'];
    case 'helpers':
      return ['tiny', 'extra-small', 'small'];
    case 'lights':
      return ['extra-small', 'small', 'medium'];
    case 'persons':
      return ['tiny', 'extra-small', 'small'];
    case 'locks':
      return ['small'];
    case 'scenes':
      return ['tiny', 'extra-small', 'small', 'medium'];
    default:
      return ['extra-small', 'small', 'medium', 'large'];
  }
}

function resolveAllowedSize(size: CardSize, allowedSizes: CardSize[]) {
  if (allowedSizes.includes(size)) {
    return size;
  }

  if (
    (size === 'large' || size === 'extra-large' || size === 'medium-vertical') &&
    allowedSizes.includes('medium')
  ) {
    return 'medium';
  }

  return allowedSizes[0] ?? size;
}

function areDashboardCardItemPropsEqual(
  previous: DashboardCardItemProps,
  next: DashboardCardItemProps
) {
  return (
    previous.id === next.id &&
    previous.size === next.size &&
    previous.isEditMode === next.isEditMode &&
    previous.device === next.device &&
    previous.card === next.card &&
    previous.zone === next.zone &&
    previous.handleSizeChange === next.handleSizeChange &&
    previous.onDeleteCard === next.onDeleteCard &&
    previous.onUpdateCard === next.onUpdateCard &&
    previous.onRemoveFromLayout === next.onRemoveFromLayout &&
    previous.onRemoveEntity === next.onRemoveEntity &&
    previous.allowEntityRemoval === next.allowEntityRemoval &&
    previous.allowExtraLargeSizes === next.allowExtraLargeSizes &&
    previous.usesHideAction === next.usesHideAction
  );
}
