import { EyeOff, X } from 'lucide-react';
import { memo } from 'react';
import { CardEditActionButton } from '@/app/components/shared/card-edit-action-button';
import { type CardSize, getCardSpanClass } from '@/app/components/shared/card-size-selector';
import { DraggableCard } from '@/app/components/shared/draggable-card';
import type { DeviceWithType } from '@/app/types/device.types';
import type { CustomCard } from '../stores/custom-cards-store';
import { renderCard } from '../utils/card-renderer';
import { DashboardResizeTrigger } from './dashboard-edit-actions';
import { WidgetCard } from './widget-card';

interface DashboardCardItemProps {
  id: string;
  size: CardSize;
  isEditMode: boolean;
  handleSizeChange: (id: string, size: CardSize) => void;
  device?: DeviceWithType;
  card?: CustomCard;
  onDeleteCard?: (cardId: string) => void;
  onUpdateCard?: (cardId: string, data: Record<string, unknown>) => void;
  onRemoveEntity?: (entityId: string) => void;
  allowEntityRemoval?: boolean;
  usesHideAction?: boolean;
}

export const DashboardCardItem = memo(function DashboardCardItem({
  id,
  size,
  isEditMode,
  handleSizeChange,
  device,
  card,
  onDeleteCard,
  onUpdateCard,
  onRemoveEntity,
  allowEntityRemoval = false,
  usesHideAction = false,
}: DashboardCardItemProps) {
  const RemoveActionIcon = usesHideAction ? EyeOff : X;
  const removeAriaLabel = 'Remove entity from dashboard';
  const spanClass =
    device?.type === 'media' && size === 'large' ? 'col-span-1 row-span-4' : getCardSpanClass(size);
  const editControlSize = device?.type === 'media' && size === 'large' ? 'medium' : size;
  const allowedSizes = getAllowedSizes(device, card);
  const cardContent = (
    <>
      {isEditMode && device && allowEntityRemoval && onRemoveEntity && (
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
      {isEditMode && !device && card && onDeleteCard && (
        <CardEditActionButton
          cardSize={editControlSize}
          Icon={X}
          placement="top-left"
          variant="destructive"
          data-dashboard-edit-action="delete-card"
          data-card-id={id}
          aria-label="Delete widget"
        />
      )}
      {isEditMode ? (
        <DashboardResizeTrigger
          cardId={id}
          cardSize={size}
          triggerSize={editControlSize}
          allowedSizes={allowedSizes}
          cardType={device?.type ?? (card ? 'widget' : undefined)}
        />
      ) : null}
      {device
        ? renderCard({ device, size, handleSizeChange, isEditMode })
        : card && (
            <WidgetCard
              card={{ ...card, size }}
              isEditMode={isEditMode}
              onDelete={onDeleteCard}
              onUpdate={onUpdateCard}
            />
          )}
    </>
  );

  if (!isEditMode) {
    return (
      <div className={`relative h-full [contain:layout_style_paint] ${spanClass}`}>{cardContent}</div>
    );
  }

  return (
    <DraggableCard id={id} isEditMode={isEditMode} className={spanClass}>
      {cardContent}
    </DraggableCard>
  );
}, areDashboardCardItemPropsEqual);

function getAllowedSizes(device?: DeviceWithType, card?: CustomCard): CardSize[] {
  if (card) {
    return ['small', 'medium', 'large'];
  }

  switch (device?.type) {
    case 'media':
      return ['small', 'medium', 'large'];
    case 'grouped-sensors':
      return ['small', 'medium'];
    case 'calendars':
      return ['small', 'medium', 'large'];
    case 'weather':
      return ['large'];
    case 'switches':
      return ['extra-small', 'small'];
    case 'locks':
      return [device.size as CardSize];
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
    previous.handleSizeChange === next.handleSizeChange &&
    previous.onDeleteCard === next.onDeleteCard &&
    previous.onUpdateCard === next.onUpdateCard &&
    previous.onRemoveEntity === next.onRemoveEntity &&
    previous.allowEntityRemoval === next.allowEntityRemoval &&
    previous.usesHideAction === next.usesHideAction
  );
}
