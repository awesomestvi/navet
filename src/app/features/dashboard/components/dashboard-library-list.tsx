import { type LucideIcon, Plus } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import type { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';

const LIST_HEIGHT = 360;
const ROW_HEIGHT = 76;
const OVERSCAN = 1;

export type DashboardLibraryCard = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  kind: 'device' | 'widget';
  icon?: LucideIcon;
};

const DashboardLibraryRow = memo(function DashboardLibraryRow({
  card,
  surface,
  onAdd,
}: {
  card: DashboardLibraryCard;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  onAdd: () => void;
}) {
  const IconComponent = card.icon;
  return (
    <button
      type="button"
      data-library-interactive="true"
      onClick={onAdd}
      className={`group flex w-full cursor-pointer items-center gap-3 rounded-[18px] border px-3 py-2.5 text-left transition-colors ${surface.border} ${surface.panelMuted} ${surface.hoverBg}`}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
      >
        {IconComponent ? (
          <IconComponent className={`h-4 w-4 ${surface.textMuted}`} aria-hidden="true" />
        ) : (
          <div className={`h-2 w-2 rounded-full ${surface.textMuted}`} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-sm font-semibold ${surface.textPrimary}`}>{card.title}</div>
        <div className={`mt-0.5 truncate text-[11px] ${surface.textSecondary}`}>
          {card.meta} <span aria-hidden="true">•</span> {card.subtitle}
        </div>
      </div>
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border"
        style={{
          borderColor: 'rgba(255,255,255,0.08)',
          backgroundColor: 'rgba(255,255,255,0.04)',
        }}
      >
        <Plus className={`h-3 w-3 ${surface.textMuted}`} />
      </div>
    </button>
  );
});

export const DashboardLibraryList = memo(function DashboardLibraryList({
  cards,
  surface,
  emptyText,
  onAdd,
  height = LIST_HEIGHT,
}: {
  cards: DashboardLibraryCard[];
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  emptyText: string;
  onAdd: (cardId: string) => void;
  height?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const visibleCount = Math.ceil(height / ROW_HEIGHT);
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(cards.length, startIndex + visibleCount + OVERSCAN * 2);
  const virtualCards = cards.slice(startIndex, endIndex);
  const topOffset = startIndex * ROW_HEIGHT;
  const totalHeight = cards.length * ROW_HEIGHT;

  return (
    <div
      ref={listRef}
      data-library-interactive="true"
      className="mt-3 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ height: `${height}px` }}
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
      {cards.length > 0 ? (
        <div className="relative" style={{ height: totalHeight }}>
          <div
            className="absolute inset-x-0 top-0 flex flex-col gap-2"
            style={{ transform: `translateY(${topOffset}px)` }}
          >
            {virtualCards.map((card) => (
              <DashboardLibraryRow
                key={card.id}
                card={card}
                surface={surface}
                onAdd={() => onAdd(card.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div
          className={`rounded-[22px] border border-dashed px-5 py-6 text-center text-sm ${surface.borderStrong} ${surface.textSecondary}`}
        >
          {emptyText}
        </div>
      )}
    </div>
  );
});
