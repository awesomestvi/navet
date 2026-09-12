import {
  type CollisionDetection,
  closestCenter,
  DndContext,
  DragOverlay,
  type KeyboardCoordinateGetter,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { BaseCard, Button } from '@navet/app/components/primitives';
import { getDndTransformStyle } from '@navet/app/components/shared/dnd-transform-style';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useDashboardDragSensors } from '@navet/app/features/dashboard/hooks/use-dashboard-drag-state';
import { useI18n, useTheme } from '@navet/app/hooks';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { GripVertical, Pin } from 'lucide-react';
import { createContext, type HTMLAttributes, type ReactNode, useContext, useState } from 'react';

const QUICKVIEW_DROP_ID = 'security-quickview-drop';
const DEVICES_DROP_ID = 'security-devices-drop';
type Location = 'quickview' | 'devices';
interface QuickviewEditorValue {
  entityIds: string[];
  onPin: (entityId: string, beforeId?: string) => void;
  onUnpin: (entityId: string) => void;
}
const QuickviewEditorContext = createContext<QuickviewEditorValue | null>(null);
/** Ignore outside drops; keyboard dragging uses the nearest registered destination. */
const quickviewCollisionDetection: CollisionDetection = (args) => {
  const collisions = args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args);
  const matches =
    collisions.length > 0 ? collisions : args.pointerCoordinates ? [] : closestCenter(args);
  return [...matches].sort((left, right) => {
    const leftCard = args.droppableContainers.find((item) => item.id === left.id)?.data.current
      ?.entityId;
    const rightCard = args.droppableContainers.find((item) => item.id === right.id)?.data.current
      ?.entityId;
    return Number(Boolean(rightCard)) - Number(Boolean(leftCard));
  });
};

/** Jump between visible destinations without requiring sortable-only metadata. */
const quickviewKeyboardCoordinates: KeyboardCoordinateGetter = (
  event,
  { currentCoordinates, context }
) => {
  const { active, collisionRect, droppableContainers, droppableRects } = context;
  if (
    !active ||
    !collisionRect ||
    !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)
  )
    return;
  event.preventDefault();
  const center = {
    x: collisionRect.left + collisionRect.width / 2,
    y: collisionRect.top + collisionRect.height / 2,
  };
  const destinations = droppableContainers
    .getEnabled()
    .flatMap((container) => {
      if (container.data.current?.entityId === active.data.current?.entityId) return [];
      if (
        container.data.current?.location === active.data.current?.location &&
        !container.data.current?.entityId
      )
        return [];
      const rect = droppableRects.get(container.id);
      if (!rect) return [];
      const delta = {
        x: rect.left + rect.width / 2 - center.x,
        y: rect.top + rect.height / 2 - center.y,
      };
      const inDirection =
        event.code === 'ArrowUp'
          ? delta.y < -1
          : event.code === 'ArrowDown'
            ? delta.y > 1
            : event.code === 'ArrowLeft'
              ? delta.x < -1
              : delta.x > 1;
      return inDirection ? [{ delta, distance: Math.hypot(delta.x, delta.y) }] : [];
    })
    .sort((left, right) => left.distance - right.distance);
  const next = destinations[0];
  return next
    ? { x: currentCoordinates.x + next.delta.x, y: currentCoordinates.y + next.delta.y }
    : undefined;
};

export function SecurityQuickviewEditor({
  children,
  entities,
  entityIds,
  onPin,
  onUnpin,
}: QuickviewEditorValue & {
  children: ReactNode;
  entities: DeviceWithType[];
}) {
  const sensors = useDashboardDragSensors(quickviewKeyboardCoordinates);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeDevice = entities.find((device) => device.id === activeId);
  const { t } = useI18n();
  return (
    <QuickviewEditorContext.Provider
      value={{
        entityIds,
        onPin: (id, overId) => {
          if (entities.some((device) => device.id === id)) onPin(id, overId);
        },
        onUnpin: (id) => {
          if (entities.some((device) => device.id === id)) onUnpin(id);
        },
      }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={quickviewCollisionDetection}
        accessibility={{
          screenReaderInstructions: { draggable: t('security.quickview.keyboardInstructions') },
          announcements: {
            onDragStart: ({ active }) =>
              t('security.quickview.drag', {
                name:
                  entities.find((device) => device.id === active.data.current?.entityId)?.name ??
                  '',
              }),
            onDragCancel: () => undefined,
            onDragOver: ({ over }) =>
              over?.data.current?.location === 'quickview'
                ? t('security.quickview.label')
                : t('security.quickview.devices'),
            onDragEnd: ({ over }) =>
              over?.data.current?.location === 'quickview'
                ? t('security.quickview.label')
                : t('security.quickview.devices'),
          },
        }}
        onDragStart={({ active }) => setActiveId(active.data.current?.entityId ?? null)}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={({ active, over }) => {
          setActiveId(null);
          const entityId = active.data.current?.entityId;
          if (
            typeof entityId !== 'string' ||
            !entities.some((device) => device.id === entityId) ||
            !over
          )
            return;
          if (over.data.current?.location === 'quickview') {
            if (over.data.current.entityId !== entityId)
              onPin(entityId, over.data.current.entityId);
          } else if (
            active.data.current?.location === 'quickview' &&
            over.data.current?.location === 'devices'
          ) {
            onUnpin(entityId);
          }
        }}
      >
        {children}
        <DragOverlay dropAnimation={null}>
          {activeDevice ? (
            <BaseCard size="small" className="flex h-full items-center justify-center">
              <GripVertical className="h-5 w-5" />
            </BaseCard>
          ) : null}
        </DragOverlay>
      </DndContext>
    </QuickviewEditorContext.Provider>
  );
}

export function SecurityQuickviewDropZone({
  children,
  location,
  isEditMode,
  showHeader = true,
}: {
  children: ReactNode;
  location: Location;
  isEditMode: boolean;
  showHeader?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: location === 'quickview' ? QUICKVIEW_DROP_ID : DEVICES_DROP_ID,
    disabled: !isEditMode,
    data: { location },
  });
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  return (
    <div
      ref={setNodeRef}
      data-security-drop-zone={location}
      className={cn(
        'min-w-0',
        isEditMode &&
          location === 'quickview' &&
          'min-h-32 rounded-[22px] border border-dashed p-3',
        isEditMode && surface.borderStrong,
        isEditMode && isOver && 'ring-2 ring-current'
      )}
    >
      {isEditMode && showHeader && location === 'quickview' ? (
        <div className="mb-3">
          <p className={cn('text-sm font-semibold', surface.textPrimary)}>
            {t('security.quickview.label')}
          </p>
          <p className={cn('text-xs', surface.textSecondary)}>{t('security.quickview.dropHint')}</p>
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function SecurityQuickviewCard({
  device,
  location,
  isEditMode,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  device: DeviceWithType;
  location: Location;
  isEditMode: boolean;
}) {
  if (!isEditMode) return <div {...props}>{children}</div>;
  return (
    <EditableQuickviewCard device={device} location={location} {...props}>
      {children}
    </EditableQuickviewCard>
  );
}

function EditableQuickviewCard({
  device,
  location,
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  device: DeviceWithType;
  location: Location;
}) {
  const editor = useContext(QuickviewEditorContext);
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const pinned = editor?.entityIds.includes(device.id) ?? false;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `security-${location}-card:${device.id}`,
    data: { entityId: device.id, location },
    disabled: !editor,
  });
  const { setNodeRef: setDropRef } = useDroppable({
    id: `security-${location}-card-drop:${device.id}`,
    data: { entityId: device.id, location },
    disabled: !editor || location !== 'quickview',
  });
  return (
    <div {...props} className={cn(className, 'relative')}>
      <div
        {...attributes}
        {...listeners}
        data-card-drag-surface="true"
        ref={(node) => {
          setNodeRef(node);
          setDropRef(node);
        }}
        className={cn(
          'relative h-full w-full cursor-grab active:cursor-grabbing',
          isDragging && 'opacity-40'
        )}
        style={isDragging ? {} : getDndTransformStyle(transform)}
      >
        {children}
      </div>
      {editor && !pinned && location === 'devices' ? (
        <Button
          variant="ghost"
          size="small"
          className={cn(
            'absolute right-2 top-2 z-30 !h-9 !w-9 !px-0',
            surface.panel,
            surface.textPrimary
          )}
          aria-label={t('security.quickview.pin', { name: device.name })}
          onClick={() => editor.onPin(device.id)}
        >
          <Pin aria-hidden="true" className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
