import { EyeOff, X } from 'lucide-react';
import { lazy, memo, Suspense } from 'react';
import { CardEditActionButton } from '@/app/components/shared/card-edit-action-button';
import { type CardSize, getCardSpanClass } from '@/app/components/shared/card-size-selector';
import { useI18n } from '@/app/hooks';
import { settingsSelectors } from '@/app/stores/selectors';
import { useSettingsStore } from '@/app/stores/settings-store';
import type { DeviceWithType } from '@/app/types/device.types';
import type { CustomCard } from '../stores/custom-cards-store';
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
  const RemoveActionIcon = usesHideAction ? EyeOff : X;
  const removeAriaLabel = t('dashboard.edit.removeEntityFromDashboard');
  const spanClass = getCardSpanClass(size);
  const editControlSize = device?.type === 'media' && size === 'medium-vertical' ? 'medium' : size;
  const allowedSizes = getAllowedSizes(device, card, allowExtraLargeSizes);

  // Drag is only enabled in edit mode when the card is inside a zone band.
  const draggable = isEditMode && zone !== undefined;

  const cardContent = (
    <>
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
        <DashboardResizeTrigger
          cardSize={size}
          triggerSize={editControlSize}
          allowedSizes={allowedSizes}
          onSizeChange={(nextSize) => handleSizeChange(id, nextSize)}
        />
      ) : null}
      {device
        ? renderCard({ device, size, handleSizeChange, isEditMode })
        : card && (
            <WidgetCard card={{ ...card, size }} isEditMode={isEditMode} onUpdate={onUpdateCard} />
          )}
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

function getAllowedSizes(
  device?: DeviceWithType,
  card?: CustomCard,
  extraLargeAllowed = true
): CardSize[] {
  if (card) {
    if (card.type === 'sparkline') {
      return ['small', 'medium'];
    }
    if (extraLargeAllowed && (card.type === 'photo' || card.type === 'rss')) {
      return ['small', 'medium', 'large', 'extra-large'];
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
    case 'calendars':
      return extraLargeAllowed
        ? ['small', 'medium', 'large', 'extra-large']
        : ['small', 'medium', 'large'];
    case 'weather':
      return extraLargeAllowed
        ? ['small', 'medium', 'large', 'extra-large']
        : ['small', 'medium', 'large'];
    case 'switches':
      return ['tiny', 'extra-small', 'small'];
    case 'locks':
      return ['tiny', 'extra-small', 'small'];
    case 'scenes':
      return ['tiny', 'extra-small', 'small', 'medium'];
    default:
      return ['extra-small', 'small', 'medium', 'large'];
  }
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
