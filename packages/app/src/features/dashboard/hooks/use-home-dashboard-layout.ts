import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  DEFAULT_HOME_DASHBOARD_LAYOUT,
  type HomeDashboardLayoutState,
  type HomeDashboardSection,
  type HomeLayoutMode,
  useHomeDashboardLayoutStore,
} from '../stores/home-dashboard-layout-store';
import {
  getBottomRow,
  getSectionCardMinColumns,
  insertSectionBelow,
  insertSectionRow,
  layoutRow,
  moveSectionStack,
  moveSectionToPosition,
  removeSectionFromLayout,
  replaceRow,
  SECTION_LAYOUT_COLUMNS,
  type SectionLayoutItem,
  sortSectionLayout,
} from '../utils/layout-engine';

export type {
  HomeDashboardLayoutState,
  HomeDashboardSection,
  HomeDashboardSectionSpan,
  HomeLayoutMode,
} from '../stores/home-dashboard-layout-store';

const SECTION_TITLE_PREFIX = 'Section';
const CUSTOM_CARD_ID_PREFIX = 'custom-';

function createSectionId() {
  return `home-section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getNextSectionTitle(sectionCount: number) {
  return `${SECTION_TITLE_PREFIX} ${sectionCount + 1}`;
}

function toHomeSection(section: SectionLayoutItem): HomeDashboardSection {
  return {
    ...section,
    span: section.w,
  };
}

function toSectionLayoutItem(section: HomeDashboardSection): SectionLayoutItem {
  return {
    id: section.id,
    title: section.title,
    x: section.x,
    y: section.y,
    w: section.w,
    h: section.h,
  };
}

export function useHomeDashboardLayout(
  validCardIds: string[],
  cardSizes: Record<string, CardSize>
) {
  const validIdSet = useMemo(() => new Set(validCardIds), [validCardIds]);
  const layout = useHomeDashboardLayoutStore(
    useShallow((state) => ({
      mode: state.mode,
      showHero: state.showHero,
      cardIds: state.cardIds,
      sections: state.sections,
      cardSectionAssignments: state.cardSectionAssignments,
    }))
  );
  const updateLayout = useHomeDashboardLayoutStore((state) => state.updateLayout);

  const persistLayout = useCallback(
    (
      updater:
        | HomeDashboardLayoutState
        | ((previous: HomeDashboardLayoutState) => HomeDashboardLayoutState)
    ) => updateLayout(updater),
    [updateLayout]
  );

  const setMode = useCallback(
    (mode: HomeLayoutMode) => {
      persistLayout((previous) => {
        if (mode !== 'sectioned') {
          return { ...previous, mode };
        }

        const sections =
          previous.sections.length > 0
            ? previous.sections
            : [
                toHomeSection({
                  id: createSectionId(),
                  title: getNextSectionTitle(0),
                  x: 0,
                  y: 0,
                  w: SECTION_LAYOUT_COLUMNS,
                  h: 1,
                }),
              ];
        const firstSectionId = sections[0]?.id;

        return {
          ...previous,
          mode,
          sections,
          cardSectionAssignments: firstSectionId
            ? Object.fromEntries(
                previous.cardIds.map((cardId) => [
                  cardId,
                  previous.cardSectionAssignments[cardId] ?? firstSectionId,
                ])
              )
            : previous.cardSectionAssignments,
        };
      });
    },
    [persistLayout]
  );

  const setShowHero = useCallback(
    (showHero: boolean) => {
      persistLayout((previous) => ({ ...previous, showHero }));
    },
    [persistLayout]
  );

  const addSection = useCallback(() => {
    const sectionId = createSectionId();

    persistLayout((previous) => ({
      ...previous,
      sections: [
        ...previous.sections,
        toHomeSection({
          id: sectionId,
          title: getNextSectionTitle(previous.sections.length),
          x: 0,
          y: getBottomRow(previous.sections.map(toSectionLayoutItem)),
          w: SECTION_LAYOUT_COLUMNS,
          h: 1,
        }),
      ],
    }));

    return sectionId;
  }, [persistLayout]);

  const addColumnSection = useCallback(
    (targetSectionId?: string) => {
      const sectionId = createSectionId();

      persistLayout((previous) => {
        const items = previous.sections.map(toSectionLayoutItem);
        const targetSection = targetSectionId
          ? previous.sections.find((section) => section.id === targetSectionId)
          : undefined;
        const nextItems = insertSectionRow(
          items,
          {
            id: sectionId,
            title: getNextSectionTitle(previous.sections.length),
          },
          targetSection?.y
        );

        return {
          ...previous,
          sections: nextItems.map(toHomeSection),
        };
      });

      return sectionId;
    },
    [persistLayout]
  );

  const addSectionBelow = useCallback(
    (targetSectionId: string) => {
      const sectionId = createSectionId();

      persistLayout((previous) => ({
        ...previous,
        sections: insertSectionBelow(
          previous.sections.map(toSectionLayoutItem),
          targetSectionId,
          sectionId,
          getNextSectionTitle(previous.sections.length)
        ).map(toHomeSection),
      }));

      return sectionId;
    },
    [persistLayout]
  );

  const renameSection = useCallback(
    (sectionId: string, title: string) => {
      persistLayout((previous) => ({
        ...previous,
        sections: previous.sections.map((section) =>
          section.id === sectionId ? { ...section, title } : section
        ),
      }));
    },
    [persistLayout]
  );

  const removeSection = useCallback(
    (sectionId: string) => {
      persistLayout((previous) => {
        const nextSections = removeSectionFromLayout(
          previous.sections.map(toSectionLayoutItem),
          sectionId
        ).map(toHomeSection);
        const fallbackSectionId = sortSectionLayout(nextSections)[0]?.id;
        const nextAssignments = Object.fromEntries(
          Object.entries(previous.cardSectionAssignments).flatMap(([cardId, assignedSectionId]) => {
            if (assignedSectionId !== sectionId) {
              return [[cardId, assignedSectionId]];
            }

            return fallbackSectionId ? [[cardId, fallbackSectionId]] : [];
          })
        );

        return {
          ...previous,
          sections: nextSections,
          cardSectionAssignments: nextAssignments,
        };
      });
    },
    [persistLayout]
  );

  const resizeSection = useCallback(
    (sectionId: string, newW: number, minWidthsBySection: Record<string, number> = {}) => {
      persistLayout((previous) => {
        const items = previous.sections.map(toSectionLayoutItem);
        const target = items.find((s) => s.id === sectionId);
        if (!target) return previous;

        const rowItems = sortSectionLayout(items.filter((s) => s.y === target.y));
        if (rowItems.length <= 1) return previous;

        const resolvedMinWidths = Object.fromEntries(
          rowItems.map((item) => {
            const sectionCardIds = previous.cardIds.filter(
              (cardId) => previous.cardSectionAssignments[cardId] === item.id
            );
            const fallbackMinWidth = Math.max(
              1,
              ...sectionCardIds.map((cardId) => getSectionCardMinColumns(cardSizes[cardId]))
            );

            return [
              item.id,
              Math.max(1, Math.round(minWidthsBySection[item.id] ?? fallbackMinWidth)),
            ];
          })
        );

        const minW = resolvedMinWidths[sectionId] ?? 1;
        const maxW =
          SECTION_LAYOUT_COLUMNS -
          rowItems
            .filter((item) => item.id !== sectionId)
            .reduce((total, item) => total + (resolvedMinWidths[item.id] ?? 1), 0);
        const clampedW = Math.max(minW, Math.min(maxW, Math.round(newW)));
        if (clampedW === target.w) return previous;

        const targetIdx = rowItems.findIndex((s) => s.id === sectionId);
        const neighborIdx = targetIdx < rowItems.length - 1 ? targetIdx + 1 : targetIdx - 1;
        const neighbor = rowItems[neighborIdx];
        if (!neighbor) return previous;

        const delta = clampedW - target.w;
        const newNeighborW = neighbor.w - delta;
        const neighborMinW = resolvedMinWidths[neighbor.id] ?? 1;
        if (newNeighborW < neighborMinW || newNeighborW > SECTION_LAYOUT_COLUMNS) return previous;

        const newRow = layoutRow(
          rowItems.map((s) => ({
            ...s,
            w: s.id === sectionId ? clampedW : s.id === neighbor.id ? newNeighborW : s.w,
          })),
          target.y
        );
        const resizedTarget = newRow.find((item) => item.id === sectionId);
        if (!resizedTarget) return previous;

        const stackedDescendantIds: string[] = [];
        let nextY = target.y + 1;

        while (true) {
          const nextRowItem = items.find(
            (item) => item.y === nextY && item.x === target.x && item.w === target.w
          );

          if (!nextRowItem) {
            break;
          }

          stackedDescendantIds.push(nextRowItem.id);
          nextY += 1;
        }

        const nextSections = replaceRow(items, target.y, newRow).map((item) =>
          stackedDescendantIds.includes(item.id)
            ? { ...item, x: resizedTarget.x, w: resizedTarget.w }
            : item
        );

        return {
          ...previous,
          sections: nextSections.map(toHomeSection),
        };
      });
    },
    [cardSizes, persistLayout]
  );

  const resetLayout = useCallback(() => {
    persistLayout(DEFAULT_HOME_DASHBOARD_LAYOUT);
  }, [persistLayout]);

  const addCard = useCallback(
    (cardId: string, sectionId?: string) => {
      if (!validIdSet.has(cardId) && !cardId.startsWith(CUSTOM_CARD_ID_PREFIX)) {
        return;
      }

      persistLayout((previous) => {
        const cardIds = previous.cardIds.includes(cardId)
          ? previous.cardIds
          : [...previous.cardIds, cardId];

        return {
          ...previous,
          cardIds,
          cardSectionAssignments:
            sectionId && previous.mode === 'sectioned'
              ? { ...previous.cardSectionAssignments, [cardId]: sectionId }
              : previous.cardSectionAssignments,
        };
      });
    },
    [persistLayout, validIdSet]
  );

  const removeCard = useCallback(
    (cardId: string) => {
      persistLayout((previous) => {
        const nextAssignments = { ...previous.cardSectionAssignments };
        delete nextAssignments[cardId];

        return {
          ...previous,
          cardIds: previous.cardIds.filter((id) => id !== cardId),
          cardSectionAssignments: nextAssignments,
        };
      });
    },
    [persistLayout]
  );

  const moveCard = useCallback(
    (activeId: string, overId: string | null, sectionId?: string) => {
      persistLayout((previous) => {
        if (!previous.cardIds.includes(activeId)) {
          return previous;
        }

        const nextAssignments =
          previous.mode === 'sectioned' && sectionId
            ? { ...previous.cardSectionAssignments, [activeId]: sectionId }
            : previous.cardSectionAssignments;
        const withoutActive = previous.cardIds.filter((id) => id !== activeId);

        if (previous.mode !== 'sectioned') {
          const nextCardIds = [...withoutActive];

          if (!overId || !withoutActive.includes(overId)) {
            nextCardIds.push(activeId);
          } else {
            nextCardIds.splice(withoutActive.indexOf(overId), 0, activeId);
          }

          return {
            ...previous,
            cardIds: nextCardIds,
            cardSectionAssignments: nextAssignments,
          };
        }

        const getCardGroupKey = (cardId: string) => nextAssignments[cardId] ?? '__flow__';
        const targetGroup = getCardGroupKey(activeId);
        const grouped = new Map<string, string[]>();

        for (const cardId of withoutActive) {
          const group = getCardGroupKey(cardId);
          const cards = grouped.get(group);
          if (cards) {
            cards.push(cardId);
          } else {
            grouped.set(group, [cardId]);
          }
        }

        const targetCards = [...(grouped.get(targetGroup) ?? [])];
        if (!overId || !targetCards.includes(overId)) {
          targetCards.push(activeId);
        } else {
          targetCards.splice(targetCards.indexOf(overId), 0, activeId);
        }
        grouped.set(targetGroup, targetCards);

        const nextCardIds = withoutActive.reduce<string[]>((result, originalCardId) => {
          const group = getCardGroupKey(originalCardId);
          const remainingCards = grouped.get(group);
          const nextCardId = remainingCards?.shift();

          if (nextCardId) {
            result.push(nextCardId);
          }

          return result;
        }, []);

        for (const remainingCards of grouped.values()) {
          nextCardIds.push(...remainingCards);
        }

        return {
          ...previous,
          cardIds: nextCardIds,
          cardSectionAssignments: nextAssignments,
        };
      });
    },
    [persistLayout]
  );

  const moveSection = useCallback(
    (sourceId: string, targetId: string) => {
      persistLayout((previous) => ({
        ...previous,
        sections: moveSectionToPosition(
          previous.sections.map(toSectionLayoutItem),
          sourceId,
          targetId
        ).map(toHomeSection),
      }));
    },
    [persistLayout]
  );

  const moveColumn = useCallback(
    (sourceId: string, targetId: string) => {
      persistLayout((previous) => ({
        ...previous,
        sections: moveSectionStack(
          previous.sections.map(toSectionLayoutItem),
          sourceId,
          targetId
        ).map(toHomeSection),
      }));
    },
    [persistLayout]
  );

  return {
    layout,
    resetLayout,
    setMode,
    setShowHero,
    addSection,
    addColumnSection,
    addSectionBelow,
    moveSection,
    moveColumn,
    renameSection,
    removeSection,
    resizeSection,
    addCard,
    removeCard,
    moveCard,
  };
}
