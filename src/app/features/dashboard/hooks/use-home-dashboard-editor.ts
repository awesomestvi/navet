import { useEffect, useMemo, useState } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { useI18n } from '@/app/hooks';
import type { DeviceWithType } from '@/app/types/device.types';
import { buildSectionStacks } from '../components/home-dashboard-overview.shared';
import type { CustomCard } from '../stores/custom-cards-store';
import { moveSectionStack } from '../utils/layout-engine';
import { useDashboardDragState } from './use-dashboard-drag-state';
import type { HomeDashboardLayoutState } from './use-home-dashboard-layout';

export type HomeEditorSection = HomeDashboardLayoutState['sections'][number] & {
  cardIds: string[];
};

export type DragMeta =
  | { source: 'home'; cardId: string; sectionId?: string; type: 'card' }
  | { source: 'column'; sectionId: string; type: 'column' }
  | { source: 'section'; sectionId: string; type: 'section' };

export type DropMeta =
  | { type: 'card'; cardId: string; sectionId?: string }
  | { type: 'container'; sectionId?: string }
  | { type: 'column-target'; sectionId: string }
  | { type: 'section-target'; sectionId: string }
  | { type: 'section-insert'; sectionId: string };

interface UseHomeDashboardEditorParams {
  deviceMap: Map<string, DeviceWithType>;
  allCustomCards: CustomCard[];
  homeLayout: HomeDashboardLayoutState;
  cardSizes: Record<string, CardSize>;
  hiddenEntityCount: number;
  moveHomeCard: (activeId: string, overId: string | null, sectionId?: string) => void;
  moveHomeSection: (sourceId: string, targetId: string) => void;
  moveHomeColumn: (sourceId: string, targetId: string) => void;
}

export function useHomeDashboardEditor({
  deviceMap,
  allCustomCards,
  homeLayout,
  cardSizes,
  hiddenEntityCount,
  moveHomeCard,
  moveHomeSection,
  moveHomeColumn,
}: UseHomeDashboardEditorParams) {
  const { t } = useI18n();
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const allCards = useMemo(() => {
    const cards = new Map<string, DeviceWithType | CustomCard>();
    for (const [id, device] of deviceMap) cards.set(id, device);
    for (const card of allCustomCards) cards.set(card.id, card);
    return cards;
  }, [allCustomCards, deviceMap]);

  const selectedIds = useMemo(
    () => homeLayout.cardIds.filter((id) => allCards.has(id)),
    [allCards, homeLayout.cardIds]
  );

  const sectionIds = useMemo(
    () => new Set(homeLayout.sections.map((s) => s.id)),
    [homeLayout.sections]
  );

  const cardsBySection = useMemo(() => {
    const grouped = new Map<string, string[]>();

    for (const id of selectedIds) {
      const sectionId = homeLayout.cardSectionAssignments[id];
      if (!sectionId || !sectionIds.has(sectionId)) {
        continue;
      }

      const existing = grouped.get(sectionId);
      if (existing) {
        existing.push(id);
      } else {
        grouped.set(sectionId, [id]);
      }
    }

    return grouped;
  }, [homeLayout.cardSectionAssignments, sectionIds, selectedIds]);

  const sectionCards = useMemo<HomeEditorSection[]>(
    () =>
      homeLayout.sections.map((section) => ({
        ...section,
        cardIds: cardsBySection.get(section.id) ?? [],
      })),
    [cardsBySection, homeLayout.sections]
  );

  useEffect(() => {
    if (homeLayout.mode !== 'sectioned') {
      return;
    }

    const firstSectionId = homeLayout.sections[0]?.id ?? null;
    const sectionIdSet = new Set(homeLayout.sections.map((section) => section.id));

    setActiveSectionId((previous) =>
      previous && sectionIdSet.has(previous) ? previous : firstSectionId
    );
  }, [homeLayout.mode, homeLayout.sections]);

  const flowCards = useMemo(() => {
    if (homeLayout.mode !== 'sectioned') {
      return selectedIds;
    }

    return selectedIds.filter((id) => {
      const assignedSectionId = homeLayout.cardSectionAssignments[id];
      return !assignedSectionId || !sectionIds.has(assignedSectionId);
    });
  }, [homeLayout.cardSectionAssignments, homeLayout.mode, sectionIds, selectedIds]);

  const sectionToColumnId = useMemo(() => {
    const mappings: Record<string, string> = {};

    for (const rowStacks of buildSectionStacks(sectionCards)) {
      for (const stack of rowStacks) {
        const leadSectionId = stack[0]?.id;
        if (!leadSectionId) {
          continue;
        }

        for (const section of stack) {
          mappings[section.id] = leadSectionId;
        }
      }
    }

    return mappings;
  }, [sectionCards]);

  const dragState = useDashboardDragState({
    allCards,
    cardSizes,
    moveHomeCard,
    moveHomeSection,
    moveHomeColumn,
    sectionToColumnId,
  });

  const previewSectionCards = useMemo(
    () =>
      dragState.activeDragColumn && dragState.activeColumnDropTarget
        ? moveSectionStack(
            sectionCards,
            dragState.activeDragColumn,
            dragState.activeColumnDropTarget
          )
        : sectionCards,
    [dragState.activeColumnDropTarget, dragState.activeDragColumn, sectionCards]
  );

  const summaryItems = useMemo(
    () => [
      { label: t('dashboard.homePersonal.stats.cards'), value: selectedIds.length },
      { label: t('dashboard.homePersonal.stats.widgets'), value: allCustomCards.length },
      { label: t('dashboard.homePersonal.stats.hidden'), value: hiddenEntityCount },
    ],
    [allCustomCards.length, hiddenEntityCount, selectedIds.length, t]
  );

  return {
    allCards,
    flowCards,
    sectionCards: previewSectionCards,
    activeSectionId,
    setActiveSectionId,
    ...dragState,
    summaryItems,
  };
}
