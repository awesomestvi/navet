import type { ReactNode } from 'react';
import { type CardSize, CardSizeSelector } from '@/app/components/shared/card-size-selector';
import { useI18n } from '@/app/hooks';

interface DashboardEditActionsProps {
  children: ReactNode;
  isEditMode: boolean;
  onDeleteCard?: (cardId: string) => void;
  onRemoveFromLayout?: (cardId: string) => void;
  onRemoveEntity?: (entityId: string) => void;
}

export function DashboardEditActions({
  children,
  isEditMode,
  onDeleteCard,
  onRemoveFromLayout,
  onRemoveEntity,
}: DashboardEditActionsProps) {
  const { t } = useI18n();

  if (!isEditMode) {
    return <>{children}</>;
  }

  return (
    <div
      onPointerDownCapture={(event) => {
        const actionTarget =
          event.target instanceof Element
            ? event.target.closest<HTMLElement>('[data-dashboard-edit-action]')
            : null;

        if (!actionTarget) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
      }}
      onClickCapture={(event) => {
        const actionTarget =
          event.target instanceof Element
            ? event.target.closest<HTMLElement>('[data-dashboard-edit-action]')
            : null;

        if (!actionTarget) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        const action = actionTarget.dataset.dashboardEditAction;
        const cardId = actionTarget.dataset.cardId;
        if (!action || !cardId) {
          return;
        }

        if (action === 'remove-entity' && onRemoveEntity) {
          onRemoveEntity(cardId);
          return;
        }

        if (action === 'remove-layout' && onRemoveFromLayout) {
          onRemoveFromLayout(cardId);
          return;
        }

        if (action === 'delete-card' && onDeleteCard) {
          if (window.confirm(t('widgets.deleteConfirm'))) {
            onDeleteCard(cardId);
          }
        }
      }}
    >
      {children}
    </div>
  );
}

interface DashboardResizeTriggerProps {
  cardSize: CardSize;
  triggerSize?: CardSize;
  allowedSizes: CardSize[];
  onSizeChange: (size: CardSize) => void;
}

export function DashboardResizeTrigger({
  cardSize,
  triggerSize,
  allowedSizes,
  onSizeChange,
}: DashboardResizeTriggerProps) {
  if (allowedSizes.length <= 1) {
    return null;
  }

  return (
    <CardSizeSelector
      currentSize={cardSize}
      onSizeChange={onSizeChange}
      allowedSizes={allowedSizes}
      triggerSize={triggerSize ?? cardSize}
    />
  );
}
