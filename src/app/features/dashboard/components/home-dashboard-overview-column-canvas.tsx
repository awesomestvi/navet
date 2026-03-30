import { useDraggable, useDroppable } from '@dnd-kit/core';
import { GripVertical, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { getDndTransformStyle } from '@/app/components/shared/dnd-transform-style';
import type { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n } from '@/app/hooks';
import type { DragMeta, DropMeta } from '../hooks/use-home-dashboard-editor';

export function ColumnCanvas({
  columnId,
  columnTitle,
  isPreviewHidden,
  accentColor,
  surface,
  children,
}: {
  columnId: string;
  columnTitle: string;
  isPreviewHidden: boolean;
  accentColor: string;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `home-column-drag-${columnId}`,
    data: { source: 'column', sectionId: columnId, type: 'column' } as DragMeta,
  });
  const {
    setNodeRef: setDroppableNodeRef,
    isOver,
    active,
  } = useDroppable({
    id: `home-column-drop-${columnId}`,
    data: { type: 'column-target', sectionId: columnId } satisfies DropMeta,
  });
  const isColumnDrag = active?.data.current?.source === 'column';

  return (
    <div
      ref={setDraggableNodeRef}
      className={`relative space-y-3 ${isPreviewHidden ? 'opacity-0' : isDragging ? 'opacity-60' : ''}`}
      style={isDragging ? undefined : getDndTransformStyle(transform, undefined)}
    >
      <div
        ref={setDroppableNodeRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10"
      />
      <div className="flex items-center gap-3 px-1">
        <button
          type="button"
          aria-label={t('dashboard.edit.moveSection', { section: columnTitle })}
          data-dashboard-drag-handle="true"
          className={`cursor-grab rounded-full border p-1.5 transition-colors active:cursor-grabbing ${surface.border} ${surface.textSecondary} ${surface.hoverBg}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="min-w-0">
          <div
            className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
          >
            {columnTitle}
          </div>
        </div>
      </div>
      <div
        className={`space-y-4 rounded-[30px] px-0 py-1 transition-[border-color,box-shadow,background-color] ${
          isOver && isColumnDrag ? surface.panel : surface.panelMuted
        }`}
        style={{
          boxShadow: isOver && isColumnDrag ? `0 0 0 1px ${accentColor}44` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function SectionInsertDropZone({
  sectionId,
  onAddSectionBelow,
  surface,
}: {
  sectionId: string;
  onAddSectionBelow: (sectionId: string) => void;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  const { t } = useI18n();
  const { setNodeRef, isOver, active } = useDroppable({
    id: `home-section-insert-${sectionId}`,
    data: { type: 'section-insert', sectionId } satisfies DropMeta,
  });
  const isSectionDrag = active?.data.current?.source === 'section';

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onAddSectionBelow(sectionId)}
      className={`flex w-full items-center justify-center gap-2 rounded-[18px] border border-dashed px-3 py-3 text-sm font-medium transition-colors ${
        isOver && isSectionDrag
          ? `${surface.borderStrong} ${surface.panel}`
          : `${surface.borderStrong} ${surface.textSecondary} ${surface.hoverBg}`
      }`}
    >
      <Plus className="h-4 w-4" />
      <span>
        {isOver && isSectionDrag
          ? t('dashboard.section.moveHere')
          : t('dashboard.section.addBelow')}
      </span>
    </button>
  );
}
