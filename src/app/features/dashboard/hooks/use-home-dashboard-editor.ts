import { useEffect, useMemo, useState } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { useI18n } from '@/app/hooks';
import type { DeviceWithType } from '@/app/types/device.types';
import type { CustomCard } from '../stores/custom-cards-store';
import { useDashboardDragState } from './use-dashboard-drag-state';
import type { HomeDashboardLayoutState } from './use-home-dashboard-layout';

export type HomeEditorSection = HomeDashboardLayoutState['sections'][number] & {
  cardIds: string[];
};

export type DragMeta =
  | { source: 'home'; cardId: string; sectionId?: string; type: 'card' }
  | { source: 'section'; sectionId: string; type: 'section' };

export type DropMeta =
  | { type: 'card'; cardId: string; sectionId?: string }
  | { type: 'container'; sectionId?: string }
  | { type: 'section-insert'; sectionId: string };

interface UseHomeDashboardEditorParams {
  deviceMap: Map<string, DeviceWithType>;
  allCustomCards: CustomCard[];
  homeLayout: HomeDashboardLayoutState;
  cardSizes: Record<string, CardSize>;
  hiddenEntityCount: number;
  moveHomeCard: (activeId: string, overId: string | null, sectionId?: string) => void;
  moveHomeSection: (sourceId: string, targetId: string) => void;
}

export function useHomeDashboardEditor({
  deviceMap,
  allCustomCards,
  homeLayout,
  cardSizes,
  hiddenEntityCount,
  moveHomeCard,
  moveHomeSection,
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

  const sectionCards = useMemo<HomeEditorSection[]>(
    () =>
      homeLayout.sections.map((section) => ({
        ...section,
        cardIds: selectedIds.filter((id) => homeLayout.cardSectionAssignments[id] === section.id),
      })),
    [homeLayout.cardSectionAssignments, homeLayout.sections, selectedIds]
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

  const dragState = useDashboardDragState({
    allCards,
    cardSizes,
    moveHomeCard,
    moveHomeSection,
  });

  const summaryItems = [
    { label: t('dashboard.homePersonal.stats.cards'), value: selectedIds.length },
    { label: t('dashboard.homePersonal.stats.widgets'), value: allCustomCards.length },
    { label: t('dashboard.homePersonal.stats.hidden'), value: hiddenEntityCount },
  ];

  return {
    allCards,
    flowCards,
    sectionCards,
    activeSectionId,
    setActiveSectionId,
    ...dragState,
    summaryItems,
  };
}
