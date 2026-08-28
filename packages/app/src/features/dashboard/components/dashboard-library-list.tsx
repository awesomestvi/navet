import { Button } from '@navet/app/components/primitives';
import type { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { navetIconSizeTokens } from '@navet/app/components/system/tokens';
import { type LucideIcon, Plus } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';

const LIST_HEIGHT = 360;
const ROW_HEIGHT = 61;
const OVERSCAN = 1;

export type DashboardLibraryCard = {
  id: string;
  title: string;
  subtitle: string;
  room?: string;
  meta: string;
  kind: 'device' | 'widget';
  icon?: LucideIcon;
  entityType?: string;
  entityTypeLabel?: string;
  idSearchText?: string;
};

export type DashboardLibraryEntityType = {
  key: string;
  label: string;
  count: number;
  icon?: LucideIcon;
};

const DashboardLibraryRow = memo(function DashboardLibraryRow({
  card,
  surface,
  addLabel,
  showDivider,
  onAdd,
}: {
  card: DashboardLibraryCard;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  addLabel: string;
  showDivider: boolean;
  onAdd: () => void;
}) {
  const IconComponent = card.icon;
  return (
    <div
      data-library-interactive="true"
      data-dashboard-library-row
      className={`flex min-h-14 items-center gap-3 px-4 py-3 ${
        showDivider ? `border-t ${surface.border}` : ''
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border ${surface.borderStrong} ${surface.iconBg} ${surface.textSecondary}`}
      >
        {IconComponent ? (
          <IconComponent className="h-4 w-4" aria-hidden="true" />
        ) : (
          <div className="h-2 w-2 rounded-full bg-current" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-sm font-medium ${surface.textPrimary}`}>{card.title}</div>
        <div className={`mt-0.5 truncate text-xs ${surface.textMuted}`}>
          {card.meta} <span aria-hidden="true">•</span> {card.subtitle}
        </div>
      </div>
      <Button
        variant="secondary"
        size="compact"
        aria-label={`${addLabel}: ${card.title}`}
        onClick={onAdd}
        leading={<Plus className={navetIconSizeTokens.xs} aria-hidden="true" />}
        className="h-[30px] shrink-0 rounded-full px-2.5 motion-reduce:transition-none md:h-8 md:px-3"
      >
        {addLabel}
      </Button>
    </div>
  );
});

export const DashboardLibraryList = memo(function DashboardLibraryList({
  cards,
  surface,
  addLabel,
  emptyText,
  onAdd,
  height = LIST_HEIGHT,
  fillAvailable = false,
}: {
  cards: DashboardLibraryCard[];
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  addLabel: string;
  emptyText: string;
  onAdd: (cardId: string) => void;
  height?: number;
  fillAvailable?: boolean;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const [measuredHeight, setMeasuredHeight] = useState(height);
  const listRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const element = listRef.current;
    if (!fillAvailable || !element || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const nextHeight = Math.floor(entry?.contentRect.height ?? 0);
      if (nextHeight > 0) {
        setMeasuredHeight(nextHeight);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [fillAvailable]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const resolvedHeight = fillAvailable ? measuredHeight : height;
  const visibleCount = Math.ceil(resolvedHeight / ROW_HEIGHT);
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(cards.length, startIndex + visibleCount + OVERSCAN * 2);
  const virtualCards = cards.slice(startIndex, endIndex);
  const topOffset = startIndex * ROW_HEIGHT;
  const totalHeight = cards.length * ROW_HEIGHT;

  if (cards.length === 0) {
    return (
      <div
        className={`rounded-[22px] border border-dashed px-5 py-6 text-center text-sm ${surface.borderStrong} ${surface.textSecondary}`}
      >
        {emptyText}
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      data-library-interactive="true"
      data-dashboard-library-list
      className={`overflow-x-hidden overflow-y-auto rounded-[24px] border ${surface.border} [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
        fillAvailable ? 'h-full min-h-0' : 'mt-3'
      }`}
      style={fillAvailable ? undefined : { height: `${height}px` }}
      onScroll={(event) => {
        const next = event.currentTarget.scrollTop;
        if (rafRef.current !== null) {
          return;
        }

        rafRef.current = window.requestAnimationFrame(() => {
          rafRef.current = null;
          setScrollTop(next);
        });
      }}
    >
      <div className="relative" style={{ height: totalHeight }}>
        <div
          className="absolute inset-x-0 top-0"
          style={{ transform: `translateY(${topOffset}px)` }}
        >
          {virtualCards.map((card, index) => (
            <DashboardLibraryRow
              key={card.id}
              card={card}
              surface={surface}
              addLabel={addLabel}
              showDivider={startIndex + index > 0}
              onAdd={() => onAdd(card.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
