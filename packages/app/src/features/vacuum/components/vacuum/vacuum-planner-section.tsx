import { getInteractivePillStyles } from '@navet/app/components/shared/theme/interactive-pill-styles';
import { getThemeFocusRingClassName, navetRadiusTokens } from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useI18n, useTheme } from '@navet/app/hooks';
import type { CSSProperties } from 'react';
import type { VacuumCleaningArea } from './vacuum-features';

interface VacuumPlannerSectionProps {
  availableAreas: VacuumCleaningArea[];
  selectedAreaIds: string[];
  onSelectedAreaIdsChange: (areaIds: string[]) => void;
  canOrderAreaCleaning: boolean;
  accentColor?: string;
  activePillStyle?: CSSProperties;
}

export function VacuumPlannerSection({
  availableAreas,
  selectedAreaIds,
  onSelectedAreaIdsChange,
  canOrderAreaCleaning,
  accentColor,
  activePillStyle,
}: VacuumPlannerSectionProps) {
  const { t } = useI18n();
  const { theme, primaryColor } = useTheme();

  const handleAreaToggle = (areaId: string) => {
    onSelectedAreaIdsChange(
      selectedAreaIds.includes(areaId)
        ? selectedAreaIds.filter((entry) => entry !== areaId)
        : [...selectedAreaIds, areaId]
    );
  };

  return (
    <div className="space-y-4">
      {availableAreas.length > 0 ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-white/62">
              {selectedAreaIds.length > 0
                ? t('vacuum.plan.selectedCount', {
                    count: String(selectedAreaIds.length),
                  })
                : t('vacuum.plan.noAreasSelected')}
            </div>
            {selectedAreaIds.length > 0 ? (
              <button
                type="button"
                onClick={() => onSelectedAreaIdsChange([])}
                className="text-xs font-medium text-white/56 transition-colors hover:text-white/78"
              >
                {t('vacuum.plan.clear')}
              </button>
            ) : null}
          </div>

          <div className="grid auto-rows-min grid-cols-2 gap-2 sm:grid-cols-3">
            {availableAreas.map((area) => {
              const selectedIndex = selectedAreaIds.indexOf(area.id);
              const active = selectedIndex !== -1;
              const pillStyles = getInteractivePillStyles({
                accentColor,
                intent: 'navigation',
                isActive: active,
                primaryColor,
                theme,
                variant: 'default',
              });

              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => handleAreaToggle(area.id)}
                  className={cn(
                    'group relative min-h-12 w-full rounded-[18px] border px-3 py-2.5 text-left transition-all',
                    navetRadiusTokens.pill,
                    getThemeFocusRingClassName(theme),
                    pillStyles.className
                  )}
                  style={{ ...pillStyles.style, ...(active ? activePillStyle : undefined) }}
                >
                  {active ? (
                    <span className="absolute top-1/2 right-2.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white/12 text-xs font-semibold text-white/88">
                      {selectedIndex + 1}
                    </span>
                  ) : null}
                  <div className={cn('min-w-0', active ? 'pr-8' : undefined)}>
                    <div className="text-sm font-medium leading-5 text-white">{area.label}</div>
                    {active ? (
                      <div className="text-[11px] text-white/50">
                        {canOrderAreaCleaning
                          ? t('vacuum.plan.selectedOrderNumber', {
                              order: String(selectedIndex + 1),
                            })
                          : null}
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-zinc-900/92 p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="max-w-xs">
            <div className="text-sm font-semibold text-white">{t('vacuum.plan.noMapTitle')}</div>
            <div className="mt-2 text-sm leading-6 text-white/68">
              {t('vacuum.plan.noMapDescription')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
