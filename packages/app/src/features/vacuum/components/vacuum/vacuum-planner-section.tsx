import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { getDndTransformStyle } from '@navet/app/components/shared/dnd-transform-style';
import { cn } from '@navet/app/components/ui/utils';
import { useI18n } from '@navet/app/hooks';
import { GripVertical } from 'lucide-react';
import { type CSSProperties, memo, useMemo } from 'react';
import type { VacuumCleaningArea } from './vacuum-features';

interface VacuumPlannerSectionProps {
  availableAreas: VacuumCleaningArea[];
  selectedAreaIds: string[];
  onSelectedAreaIdsChange: (areaIds: string[]) => void;
  canOrderAreaCleaning: boolean;
  sectionStyle?: CSSProperties;
}

export function VacuumPlannerSection({
  availableAreas,
  selectedAreaIds,
  onSelectedAreaIdsChange,
  canOrderAreaCleaning,
}: VacuumPlannerSectionProps) {
  const { t } = useI18n();
  const selectedAreas = useMemo(() => {
    const byId = new Map(availableAreas.map((area) => [area.id, area]));
    return selectedAreaIds.flatMap((id) => {
      const area = byId.get(id);
      return area ? [area] : [];
    });
  }, [availableAreas, selectedAreaIds]);

  const handleAreaToggle = (areaId: string) => {
    onSelectedAreaIdsChange(
      selectedAreaIds.includes(areaId)
        ? selectedAreaIds.filter((entry) => entry !== areaId)
        : [...selectedAreaIds, areaId]
    );
  };

  return (
    <div className="space-y-4">
      {availableAreas.length > 0 ? (
        <>
          <div className="grid auto-rows-min grid-cols-2 gap-2 sm:grid-cols-3">
            {availableAreas.map((area) => {
              const selectedIndex = selectedAreaIds.indexOf(area.id);
              const active = selectedIndex !== -1;

              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => handleAreaToggle(area.id)}
                  className={cn(
                    'group relative rounded-[18px] border px-3 py-2.5 text-left transition-all',
                    active
                      ? 'border-white/18 bg-white/8 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]'
                      : 'border-white/8 bg-zinc-950/92 text-white/76 hover:border-white/14 hover:bg-zinc-900/92'
                  )}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium leading-5 text-white">{area.label}</div>
                    <div className="text-[11px] text-white/50">
                      {active
                        ? canOrderAreaCleaning
                          ? t('vacuum.plan.selectedOrderNumber', {
                              order: String(selectedIndex + 1),
                            })
                          : t('vacuum.plan.selectedAreas')
                        : t('vacuum.plan.tapToAdd')}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-white">
                {canOrderAreaCleaning
                  ? t('vacuum.plan.selectedAreasOrdered')
                  : t('vacuum.plan.selectedAreas')}
              </div>
              {selectedAreas.length > 0 ? (
                <div className="flex items-center gap-2">
                  <div className="text-xs text-white/54">
                    {t('vacuum.plan.selectedCount', {
                      count: String(selectedAreas.length),
                    })}
                  </div>
                  <div className="h-3.5 w-px bg-white/10" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={() => onSelectedAreaIdsChange([])}
                    className="text-xs font-medium text-white/56 transition-colors hover:text-white/78"
                  >
                    {t('vacuum.plan.clear')}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="max-h-28 overflow-auto pr-1">
              {selectedAreas.length === 0 ? (
                <div className="px-0 py-1 text-sm text-white/62">
                  {t('vacuum.plan.noAreasSelected')}
                </div>
              ) : canOrderAreaCleaning ? (
                <SelectedAreaSortList
                  areas={selectedAreas}
                  onReorder={(areaIds) => onSelectedAreaIdsChange(areaIds)}
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedAreas.map((area, index) => (
                    <div
                      key={area.id}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/84 px-3 py-2 text-sm text-white"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white/78">
                        {index + 1}
                      </span>
                      <span>{area.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-zinc-900/92 p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="max-w-xs">
            <div className="text-sm font-semibold text-white">{t('vacuum.plan.noMapTitle')}</div>
            <div className="mt-2 text-sm leading-6 text-white/68">
              {t('vacuum.plan.noMapDescription')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SelectedAreaSortListProps {
  areas: VacuumCleaningArea[];
  onReorder: (areaIds: string[]) => void;
  sectionStyle?: CSSProperties;
}

const SelectedAreaSortList = memo(function SelectedAreaSortList({
  areas,
  onReorder,
  sectionStyle,
}: SelectedAreaSortListProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = areas.findIndex((area) => area.id === String(active.id));
    const newIndex = areas.findIndex((area) => area.id === String(over.id));

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    onReorder(arrayMove(areas, oldIndex, newIndex).map((area) => area.id));
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={areas.map((area) => area.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {areas.map((area, index) => (
            <SortableSelectedAreaRow
              key={area.id}
              area={area}
              index={index}
              sectionStyle={sectionStyle}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
});

interface SelectedAreaRowProps {
  area: VacuumCleaningArea;
  index: number;
  isSortable: boolean;
  sectionStyle?: CSSProperties;
  attributes?: ReturnType<typeof useSortable>['attributes'];
  listeners?: ReturnType<typeof useSortable>['listeners'];
  setNodeRef?: ReturnType<typeof useSortable>['setNodeRef'];
  transform?: ReturnType<typeof useSortable>['transform'];
  transition?: ReturnType<typeof useSortable>['transition'];
}

function SelectedAreaRow({
  area,
  index,
  isSortable,
  sectionStyle,
  attributes,
  listeners,
  setNodeRef,
  transform,
  transition,
}: SelectedAreaRowProps) {
  const { t } = useI18n();

  return (
    <div
      ref={setNodeRef}
      style={{
        ...getDndTransformStyle(transform ?? null, transition),
        ...sectionStyle,
      }}
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/84 px-3 py-3"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/8 text-xs font-semibold text-white/80">
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold leading-5 text-white">{area.label}</div>
      </div>
      {isSortable ? (
        <button
          type="button"
          aria-label={t('vacuum.plan.reorderArea', { area: area.label })}
          className="flex h-8 w-8 touch-none items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/8 hover:text-white/78"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

const SortableSelectedAreaRow = memo(function SortableSelectedAreaRow({
  area,
  index,
  sectionStyle,
}: {
  area: VacuumCleaningArea;
  index: number;
  sectionStyle?: CSSProperties;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: area.id,
  });

  return (
    <SelectedAreaRow
      area={area}
      index={index}
      isSortable
      sectionStyle={sectionStyle}
      attributes={attributes}
      listeners={listeners}
      setNodeRef={setNodeRef}
      transform={transform}
      transition={transition}
    />
  );
});
