import { type SetStateAction, useCallback, useMemo, useState } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { STORAGE_KEYS } from '@/app/constants/storage-keys';
import { storage } from '@/app/utils/storage';
import {
  buildBalancedWidths,
  clampWidth,
  compactRows,
  compactStackGaps,
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
  translateGridUnits,
} from '../utils/layout-engine';

export type HomeLayoutMode = 'flow' | 'sectioned';
export type HomeDashboardSectionSpan = number;

export interface HomeDashboardSection extends SectionLayoutItem {
  span: HomeDashboardSectionSpan;
}

export interface HomeDashboardLayoutState {
  mode: HomeLayoutMode;
  showHero: boolean;
  cardIds: string[];
  sections: HomeDashboardSection[];
  cardSectionAssignments: Record<string, string>;
}

type LegacyHomeDashboardSection = {
  id: string;
  title: string;
  span?: unknown;
  stackUnder?: unknown;
  x?: unknown;
  y?: unknown;
  w?: unknown;
  h?: unknown;
};

type LegacySectionWithCoordinates = LegacyHomeDashboardSection & {
  id: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h?: number;
};

const DEFAULT_LAYOUT: HomeDashboardLayoutState = {
  mode: 'flow',
  showHero: true,
  cardIds: [],
  sections: [],
  cardSectionAssignments: {},
};

const SECTION_TITLE_PREFIX = 'Section';
const LEGACY_TOTAL_SECTION_COLUMNS = 8;
const CUSTOM_CARD_ID_PREFIX = 'custom-';

function createSectionId() {
  return `home-section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getNextSectionTitle(sectionCount: number) {
  return `${SECTION_TITLE_PREFIX} ${sectionCount + 1}`;
}

function normalizeCoordinate(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return Math.max(0, value);
  }

  return 0;
}

function normalizeSpan(value: unknown, maxColumns = SECTION_LAYOUT_COLUMNS) {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return clampWidth(value, maxColumns);
  }

  return maxColumns;
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

function partitionLegacyRows<T extends { span: number }>(sections: T[]) {
  const rows: T[][] = [];
  let currentRow: T[] = [];
  let currentWidth = 0;

  for (const section of sections) {
    if (currentRow.length > 0 && currentWidth + section.span > LEGACY_TOTAL_SECTION_COLUMNS) {
      rows.push(currentRow);
      currentRow = [];
      currentWidth = 0;
    }

    currentRow.push(section);
    currentWidth += section.span;

    if (currentWidth >= LEGACY_TOTAL_SECTION_COLUMNS) {
      rows.push(currentRow);
      currentRow = [];
      currentWidth = 0;
    }
  }

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return rows;
}

function migrateLegacySections(sections: LegacyHomeDashboardSection[]) {
  const validSections = sections
    .filter(
      (section): section is LegacyHomeDashboardSection & { id: string; title: string } =>
        typeof section?.id === 'string' && typeof section?.title === 'string'
    )
    .map((section) => ({
      id: section.id,
      title: section.title,
      span: normalizeSpan(section.span, LEGACY_TOTAL_SECTION_COLUMNS),
      stackUnder: typeof section.stackUnder === 'string' ? section.stackUnder : undefined,
    }));

  if (validSections.length === 0) {
    return [];
  }

  const sectionIds = new Set(validSections.map((section) => section.id));
  const childrenByParent = new Map<string, typeof validSections>();
  const topLevelSections = validSections.filter(
    (section) => !section.stackUnder || !sectionIds.has(section.stackUnder)
  );

  for (const section of validSections) {
    if (!section.stackUnder || !sectionIds.has(section.stackUnder)) {
      continue;
    }

    const children = childrenByParent.get(section.stackUnder);
    if (children) {
      children.push(section);
    } else {
      childrenByParent.set(section.stackUnder, [section]);
    }
  }

  const getSubtreeHeight = (sectionId: string): number => {
    const children = childrenByParent.get(sectionId) ?? [];
    return 1 + children.reduce((total, child) => total + getSubtreeHeight(child.id), 0);
  };

  const migrated: SectionLayoutItem[] = [];
  const appendSection = (
    section: (typeof validSections)[number],
    x: number,
    y: number,
    w: number
  ) => {
    migrated.push({
      id: section.id,
      title: section.title,
      x,
      y,
      w,
      h: 1,
    });

    let nextY = y + 1;
    for (const child of childrenByParent.get(section.id) ?? []) {
      appendSection(child, x, nextY, w);
      nextY += getSubtreeHeight(child.id);
    }
  };

  let rowY = 0;
  for (const row of partitionLegacyRows(topLevelSections)) {
    const widths = buildBalancedWidths(row.length, LEGACY_TOTAL_SECTION_COLUMNS).map((span) =>
      clampWidth(translateGridUnits(span, LEGACY_TOTAL_SECTION_COLUMNS, SECTION_LAYOUT_COLUMNS))
    );

    let x = 0;
    let rowHeight = 1;
    row.forEach((section, index) => {
      const w = widths[index] ?? SECTION_LAYOUT_COLUMNS;
      appendSection(section, x, rowY, w);
      rowHeight = Math.max(rowHeight, getSubtreeHeight(section.id));
      x += w;
    });
    rowY += rowHeight;
  }

  return compactRows(migrated).map(toHomeSection);
}

function normalizeLayout(value: unknown): HomeDashboardLayoutState {
  if (typeof value !== 'object' || value === null) {
    return DEFAULT_LAYOUT;
  }

  const candidate = value as {
    mode?: unknown;
    showHero?: unknown;
    cardIds?: unknown;
    sections?: LegacyHomeDashboardSection[];
    cardSectionAssignments?: unknown;
  };

  const sections = Array.isArray(candidate.sections)
    ? candidate.sections.every(
        (section) =>
          typeof section?.id === 'string' &&
          typeof section?.title === 'string' &&
          typeof section?.x === 'number' &&
          typeof section?.y === 'number' &&
          typeof section?.w === 'number'
      )
      ? compactStackGaps(
          compactRows(
            candidate.sections
              .filter(
                (section): section is LegacySectionWithCoordinates =>
                  typeof section?.id === 'string' &&
                  typeof section?.title === 'string' &&
                  typeof section?.x === 'number' &&
                  typeof section?.y === 'number' &&
                  typeof section?.w === 'number'
              )
              .map((section) => ({
                id: section.id,
                title: section.title,
                x: normalizeCoordinate(section.x),
                y: normalizeCoordinate(section.y),
                w: normalizeSpan(section.w),
                h: normalizeCoordinate(section.h) || 1,
              }))
          )
        ).map(toHomeSection)
      : migrateLegacySections(candidate.sections)
    : [];

  return {
    mode: candidate.mode === 'sectioned' ? 'sectioned' : 'flow',
    showHero: candidate.showHero !== false,
    cardIds: Array.isArray(candidate.cardIds)
      ? candidate.cardIds.filter((id): id is string => typeof id === 'string')
      : [],
    sections,
    cardSectionAssignments:
      candidate.cardSectionAssignments &&
      typeof candidate.cardSectionAssignments === 'object' &&
      !Array.isArray(candidate.cardSectionAssignments)
        ? Object.fromEntries(
            Object.entries(candidate.cardSectionAssignments).filter(
              ([cardId, sectionId]) => typeof cardId === 'string' && typeof sectionId === 'string'
            )
          )
        : {},
  };
}

export function useHomeDashboardLayout(
  validCardIds: string[],
  cardSizes: Record<string, CardSize>
) {
  const validIdSet = useMemo(() => new Set(validCardIds), [validCardIds]);
  const [layout, setLayout] = useState<HomeDashboardLayoutState>(() =>
    normalizeLayout(storage.get(STORAGE_KEYS.homeDashboardLayout, DEFAULT_LAYOUT))
  );

  const persistLayout = useCallback((updater: SetStateAction<HomeDashboardLayoutState>) => {
    setLayout((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : updater;
      storage.set(STORAGE_KEYS.homeDashboardLayout, next);
      return next;
    });
  }, []);

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
    persistLayout(DEFAULT_LAYOUT);
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
