import { useEffect, useMemo, useState } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { getDeviceTypeLabel } from '@/app/constants/device-type-labels';
import { useI18n } from '@/app/hooks';
import type { DeviceWithType } from '@/app/types/device.types';
import type { CustomCard } from '../stores/custom-cards-store';
import { useDashboardDragState } from './use-dashboard-drag-state';
import type { HomeDashboardLayoutState } from './use-home-dashboard-layout';

export type LibraryCard = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  kind: 'device' | 'widget';
};

export type HomeEditorSection = HomeDashboardLayoutState['sections'][number] & {
  cardIds: string[];
};

export type DragMeta =
  | { source: 'library'; cardId: string }
  | { source: 'home'; cardId: string; sectionId?: string; type: 'card' }
  | { source: 'section'; sectionId: string; type: 'section' };

export type DropMeta =
  | { type: 'card'; cardId: string; sectionId?: string }
  | { type: 'container'; sectionId?: string }
  | { type: 'section-insert'; sectionId: string };

const widgetTypeLabels: Record<CustomCard['type'], string> = {
  rss: 'RSS widget',
  photo: 'Photo widget',
  note: 'Note widget',
  battery: 'Battery widget',
  button: 'Button widget',
  presence: 'Presence widget',
};

interface UseHomeDashboardEditorParams {
  deviceMap: Map<string, DeviceWithType>;
  availableDeviceMap: Map<string, DeviceWithType>;
  allCustomCards: CustomCard[];
  homeLayout: HomeDashboardLayoutState;
  cardSizes: Record<string, CardSize>;
  hiddenEntityCount: number;
  addHomeCard: (cardId: string, sectionId?: string) => void;
  moveHomeCard: (activeId: string, overId: string | null, sectionId?: string) => void;
  moveHomeSection: (sourceId: string, targetId: string) => void;
  addHomeSection: () => string;
  onShowEntity: (entityId: string) => void;
}

export function useHomeDashboardEditor({
  deviceMap,
  availableDeviceMap,
  allCustomCards,
  homeLayout,
  cardSizes,
  hiddenEntityCount,
  addHomeCard,
  moveHomeCard,
  moveHomeSection,
  addHomeSection,
  onShowEntity,
}: UseHomeDashboardEditorParams) {
  const { t } = useI18n();
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [libraryQuery, setLibraryQuery] = useState('');

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

  // Use selectedIds (cards actively rendered on the dashboard) rather than raw homeLayout.cardIds
  // so that a card which is in the layout but currently hidden still appears in the library.
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const libraryCards = useMemo<LibraryCard[]>(() => {
    // Use availableDeviceMap (all HA entities, unfiltered by hidden state) so that hidden
    // entities still appear in the library and can be added to the home layout.
    const deviceCards: LibraryCard[] = [...availableDeviceMap.values()].map((device) => ({
      id: device.id,
      title: typeof device.name === 'string' ? device.name : device.id,
      subtitle: typeof device.room === 'string' ? device.room : '',
      meta:
        ('entityType' in device && typeof device.entityType === 'string' && device.entityType) ||
        getDeviceTypeLabel(device.type, t),
      kind: 'device',
    }));
    const widgetCards: LibraryCard[] = allCustomCards.map((card) => ({
      id: card.id,
      title: card.data?.title && typeof card.data.title === 'string' ? card.data.title : card.type,
      subtitle: widgetTypeLabels[card.type],
      meta: card.id,
      kind: 'widget',
    }));
    return [...deviceCards, ...widgetCards].filter((card) => !selectedIdSet.has(card.id));
  }, [allCustomCards, availableDeviceMap, selectedIdSet, t]);

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
    addHomeCard,
    moveHomeCard,
    moveHomeSection,
  });

  const filteredLibraryCards = useMemo(() => {
    const normalizedQuery = libraryQuery.trim().toLowerCase();
    if (!normalizedQuery) return libraryCards;
    return libraryCards.filter((card) =>
      `${card.title} ${card.subtitle} ${card.meta} ${card.kind} ${card.id}`
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [libraryCards, libraryQuery]);

  const handleAddFromLibrary = (cardId: string) => {
    // If the entity is hidden (in availableDeviceMap but not in the filtered deviceMap),
    // unhide it so it becomes visible once added to the home layout.
    if (availableDeviceMap.has(cardId) && !deviceMap.has(cardId)) {
      onShowEntity(cardId);
    }

    if (homeLayout.mode !== 'sectioned') {
      addHomeCard(cardId);
      return;
    }

    const targetSectionId =
      (activeSectionId &&
        homeLayout.sections.some((section) => section.id === activeSectionId) &&
        activeSectionId) ||
      homeLayout.sections[0]?.id ||
      addHomeSection();

    addHomeCard(cardId, targetSectionId);
  };

  const summaryItems = [
    { label: t('dashboard.homePersonal.stats.cards'), value: selectedIds.length },
    { label: t('dashboard.homePersonal.stats.available'), value: libraryCards.length },
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
    libraryCards,
    libraryQuery,
    setLibraryQuery,
    filteredLibraryCards,
    handleAddFromLibrary,
    summaryItems,
  };
}
