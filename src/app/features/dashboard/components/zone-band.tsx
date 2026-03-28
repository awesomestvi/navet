import { useDroppable } from '@dnd-kit/core';
import { type CSSProperties, memo } from 'react';
import {
  type CardSize,
  getDashboardGridColumnCount,
} from '@/app/components/shared/card-size-selector';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import { useBreakpointCols } from '@/app/hooks/use-breakpoint-cols';
import type { TranslationKey } from '@/app/i18n';
import type { DeviceWithType } from '@/app/types/device.types';
import type { CustomCard } from '../stores/custom-cards-store';
import { ZONE_I18N_KEYS, type ZoneName } from '../zones/zone-types';
import { DashboardCardItem } from './dashboard-card-item';
import { DashboardEditActions } from './dashboard-edit-actions';
import { ZonePlaceholder } from './zone-placeholder';

interface ZoneBandProps {
  zone: ZoneName;
  orderedIds: string[];
  deviceMap: Map<string, DeviceWithType>;
  customCardMap: Map<string, CustomCard>;
  cardSizes: Record<string, CardSize>;
  handleSizeChange: (id: string, size: CardSize) => void;
  isEditMode: boolean;
  onDeleteCard?: (cardId: string) => void;
  onUpdateCard?: (cardId: string, data: Record<string, unknown>) => void;
}

const PLACEHOLDER_COUNT = 3;

export const ZoneBand = memo(function ZoneBand({
  zone,
  orderedIds,
  deviceMap,
  customCardMap,
  cardSizes,
  handleSizeChange,
  isEditMode,
  onDeleteCard,
  onUpdateCard,
}: ZoneBandProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const colCount = useBreakpointCols();

  const { setNodeRef, isOver } = useDroppable({
    id: `zone-band-${zone}`,
    data: { zone },
  });

  const gridContent = (
    <div
      ref={setNodeRef}
      className={`grid w-full auto-rows-[87px] grid-flow-row-dense gap-2 md:gap-3 lg:gap-4 [grid-template-columns:repeat(var(--zone-cols),minmax(0,1fr))] ${isOver ? 'rounded-2xl ring-1 ring-white/20' : ''}`}
      style={{ '--zone-cols': getDashboardGridColumnCount(colCount) } as CSSProperties}
    >
      {orderedIds.map((id) => {
        const device = deviceMap.get(id);
        if (device) {
          return (
            <DashboardCardItem
              key={device.id}
              id={device.id}
              device={device}
              size={cardSizes[device.id] ?? (device.size as CardSize)}
              isEditMode={isEditMode}
              handleSizeChange={handleSizeChange}
              zone={zone}
            />
          );
        }

        const card = customCardMap.get(id);
        if (!card) return null;

        return (
          <DashboardCardItem
            key={card.id}
            id={card.id}
            card={card}
            size={cardSizes[card.id] ?? card.size}
            isEditMode={isEditMode}
            handleSizeChange={handleSizeChange}
            zone={zone}
            onDeleteCard={onDeleteCard}
            onUpdateCard={onUpdateCard}
          />
        );
      })}
      {isEditMode &&
        Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => (
          <ZonePlaceholder key={`placeholder-${zone}-${i}`} zone={zone} index={i} />
        ))}
    </div>
  );

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h2 className={`text-sm font-semibold uppercase tracking-[0.14em] ${surface.textMuted}`}>
          {t(ZONE_I18N_KEYS[zone] as TranslationKey)}
        </h2>
        <div className={`h-px flex-1 ${surface.borderStrong}`} />
      </div>

      <DashboardEditActions
        isEditMode={isEditMode}
        onDeleteCard={onDeleteCard}
        onSizeChange={handleSizeChange}
      >
        {gridContent}
      </DashboardEditActions>
    </div>
  );
});
