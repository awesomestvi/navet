import { useDraggable, useDroppable } from '@dnd-kit/core';
import { getDndTransformStyle } from '@navet/app/components/shared/dnd-transform-style';
import type { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@navet/app/hooks';
import { GripVertical, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
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
  const { theme } = useTheme();
  const tabBackground = theme === 'light' ? 'bg-white/70' : 'bg-white/8';
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
      className={`relative space-y-4 ${isPreviewHidden ? 'opacity-0' : isDragging ? 'opacity-60' : ''}`}
      style={isDragging ? undefined : getDndTransformStyle(transform, undefined)}
    >
      <div
        ref={setDroppableNodeRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10"
      />
      <div data-dashboard-column-header className="flex min-w-0 items-end">
        <span
          aria-hidden="true"
          data-dashboard-column-rule="start"
          className={`w-2.5 shrink-0 border-b ${surface.borderStrong}`}
        />
        <div
          data-dashboard-column-tab
          className={`inline-flex max-w-[calc(100%_-_0.625rem)] min-w-0 items-center gap-2 rounded-t-xl border border-b-0 px-1.5 pt-0.5 ${surface.borderStrong} ${tabBackground}`}
        >
          <button
            type="button"
            aria-label={t('dashboard.edit.moveSection', { section: columnTitle })}
            data-dashboard-drag-handle="true"
            className={`flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-full transition-colors active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current ${surface.textSecondary} ${surface.hoverBg}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <span
            className={`min-w-0 truncate pr-2 text-xs font-semibold uppercase tracking-[0.14em] ${surface.textMuted}`}
          >
            {columnTitle}
          </span>
        </div>
        <span
          aria-hidden="true"
          data-dashboard-column-rule="end"
          className={`min-w-0 flex-1 border-b ${surface.borderStrong}`}
        />
      </div>
      <div
        className="space-y-4 transition-shadow"
        style={{
          boxShadow: isOver && isColumnDrag ? `0 0 0 1px ${accentColor}44` : undefined,
        }}
        data-dashboard-column-canvas="flat"
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
