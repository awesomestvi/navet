import { type CardSize, getCardSpanClass } from '@navet/app/components/shared/card-size-selector';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import type { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { DashboardCardItem, DashboardEditActions } from '@navet/app/features/dashboard';
import { useFitDashboardGrid } from '@navet/app/features/dashboard/hooks/use-fit-dashboard-grid';
import { useCardState, useTheme } from '@navet/app/hooks';
import { useBreakpointCols } from '@navet/app/hooks/use-breakpoint-cols';
import type { DeviceCollection, DeviceWithType } from '@navet/app/types/device.types';
import { type CSSProperties, memo, type ReactNode } from 'react';

export const EntityGrid = memo(function EntityGrid({
  devices,
  rawDevices,
  title,
  singularLabel,
  pluralLabel,
  isEditMode = false,
  cardSizeStorageKey = 'cardSizes',
  headerAction,
  onRemoveEntity,
  allowEntityRemoval = false,
  usesHideAction = false,
}: {
  devices: DeviceWithType[];
  rawDevices: DeviceCollection;
  title: string;
  singularLabel: string;
  pluralLabel: string;
  isEditMode?: boolean;
  cardSizeStorageKey?: keyof typeof STORAGE_KEYS;
  headerAction?: ReactNode;
  onRemoveEntity?: (entityId: string) => void;
  allowEntityRemoval?: boolean;
  usesHideAction?: boolean;
}) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const breakpointCols = useBreakpointCols();
  const { outerRef, innerRef, outerContainerStyle, innerContainerStyle, isAutoScaled, gridStyle } =
    useFitDashboardGrid(breakpointCols);
  const { cardSizes, updateCardSize } = useCardState(rawDevices, cardSizeStorageKey);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className={`text-lg font-semibold md:text-xl ${surface.textPrimary}`}>{title}</h2>
          <span className={`text-xs md:text-sm ${surface.textSecondary}`}>
            {devices.length} {devices.length === 1 ? singularLabel : pluralLabel}
          </span>
        </div>
        {headerAction}
      </div>
      <DashboardEditActions isEditMode={isEditMode} onRemoveEntity={onRemoveEntity}>
        <div ref={outerRef} className="relative w-full" style={outerContainerStyle}>
          <div
            ref={innerRef}
            className={`w-full${isAutoScaled ? ' absolute left-0 top-0 origin-top-left' : ''}`}
            style={innerContainerStyle}
          >
            <div
              className="grid w-full grid-flow-row-dense gap-3 lg:gap-4"
              style={gridStyle as CSSProperties}
            >
              {devices.map((device) => {
                const size = (cardSizes[device.id] ?? device.size) as CardSize;

                return (
                  <div key={device.id} className={getCardSpanClass(size)}>
                    <DashboardCardItem
                      id={device.id}
                      device={device}
                      size={size}
                      isEditMode={isEditMode}
                      handleSizeChange={updateCardSize}
                      onRemoveEntity={onRemoveEntity}
                      allowEntityRemoval={allowEntityRemoval}
                      usesHideAction={usesHideAction}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DashboardEditActions>
    </section>
  );
});
