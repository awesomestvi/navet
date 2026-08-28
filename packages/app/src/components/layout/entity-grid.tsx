import { type CardSize, getCardSpanClass } from '@navet/app/components/shared/card-size-selector';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import type { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { DashboardCardItem, DashboardEditActions } from '@navet/app/features/dashboard';
import { useFitDashboardGrid } from '@navet/app/features/dashboard/hooks/use-fit-dashboard-grid';
import { useCardState, useTheme } from '@navet/app/hooks';
import { useBreakpointCols } from '@navet/app/hooks/use-breakpoint-cols';
import type { DeviceCollection, DeviceWithType } from '@navet/app/types/device.types';
import { ChevronDown } from 'lucide-react';
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
  cardVariantById,
  sectionId,
  isCollapsed = false,
  onToggleCollapse,
  showHeader = true,
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
  cardVariantById?: ReadonlyMap<string, 'media-stack'>;
  sectionId?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  showHeader?: boolean;
}) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const breakpointCols = useBreakpointCols();
  const { outerRef, innerRef, outerContainerStyle, innerContainerStyle, isAutoScaled, gridStyle } =
    useFitDashboardGrid(breakpointCols);
  const { cardSizes, updateCardSize } = useCardState(rawDevices, cardSizeStorageKey);

  const panelId = sectionId ? `entity-grid-panel-${sectionId}` : undefined;
  const headerContent = (
    <div className="flex items-center gap-3">
      <h2 className={`text-lg font-semibold md:text-xl ${surface.textPrimary}`}>{title}</h2>
      {onToggleCollapse ? (
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent transition-colors ${surface.hoverBg}`}
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${surface.textMuted} ${
              isCollapsed ? '' : 'rotate-180'
            }`}
            aria-hidden="true"
          />
        </span>
      ) : null}
      <span className={`text-xs md:text-sm ${surface.textSecondary}`}>
        {devices.length} {devices.length === 1 ? singularLabel : pluralLabel}
      </span>
    </div>
  );

  return (
    <section className={showHeader ? 'space-y-4' : undefined}>
      {showHeader ? (
        <div className="flex items-center justify-between gap-3">
          {onToggleCollapse ? (
            <button
              type="button"
              aria-expanded={!isCollapsed}
              aria-controls={panelId}
              onClick={onToggleCollapse}
              className="flex min-w-0 flex-1 items-center text-left"
            >
              {headerContent}
            </button>
          ) : (
            headerContent
          )}
          {headerAction}
        </div>
      ) : null}
      {!isCollapsed ? (
        <div id={panelId}>
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
                          presentationVariant={cardVariantById?.get(device.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </DashboardEditActions>
        </div>
      ) : null}
    </section>
  );
});
