import { CardDialogChoicePill, CardDialogSection } from '@navet/app/components/patterns';
import { BaseCardDialogWithState } from '@navet/app/components/primitives';
import { getEnergyNowWidgetSurfaceTokens } from '@navet/app/components/shared/theme/energy-widget-surface-tokens';
import { useI18n } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { Bolt } from 'lucide-react';
import { getDashboardWidgetSurfaceTokens } from './widget-surface-tokens';

export interface EnergySourceOption {
  id: string;
  name: string;
  currentPowerW: number;
  todayUsageKWh: number;
  trendEntityId?: string;
  group: 'home' | 'sources' | 'devices';
}

interface EnergyNowSettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  options: EnergySourceOption[];
  selectedSourceId?: string;
  onSelectionChange?: (selectedSourceId: string) => void;
  roomValue: string;
  roomLabel: string;
  roomOptions: Array<{ label: string; value: string }>;
  onRoomChange?: (room: string) => void;
  tintColor?: string;
  onTintColorChange?: (color: string) => void;
  theme: ThemeType;
}

export function EnergyNowSettingsDialog({
  isOpen,
  onOpenChange,
  options,
  selectedSourceId,
  onSelectionChange,
  roomValue,
  roomLabel,
  roomOptions,
  onRoomChange,
  tintColor,
  onTintColorChange,
  theme,
}: EnergyNowSettingsDialogProps) {
  const { t } = useI18n();
  const groupedOptions = [
    {
      key: 'home',
      label: t('widgets.energyNow.settings.group.home'),
      items: options.filter((option) => option.group === 'home'),
    },
    {
      key: 'sources',
      label: t('widgets.energyNow.settings.group.sources'),
      items: options.filter((option) => option.group === 'sources'),
    },
    {
      key: 'devices',
      label: t('widgets.energyNow.settings.group.devices'),
      items: options.filter((option) => option.group === 'devices'),
    },
  ].filter((group) => group.items.length > 0);
  const surface = getDashboardWidgetSurfaceTokens(theme, tintColor);
  const baseSurface = getDashboardWidgetSurfaceTokens(theme);
  const energySurface = getEnergyNowWidgetSurfaceTokens(theme);
  const selectedId = selectedSourceId;
  const optionFill = baseSurface.subtleFill;

  const controlsTabContent = (
    <CardDialogSection
      label={t('widgets.energyNow.settings.sources')}
      helperText={t('widgets.energyNow.settings.help')}
    >
      {options.length === 0 ? (
        <p
          className={`rounded-2xl border px-4 py-4 text-sm ${surface.borderClassName} ${surface.textMuted}`}
        >
          {t('widgets.energyNow.settings.noneAvailable')}
        </p>
      ) : (
        <div className="space-y-4">
          {groupedOptions.map((group) => (
            <CardDialogSection key={group.key} label={group.label} className="mb-4 last:mb-0">
              <div className="space-y-2">
                {group.items.map((option) => {
                  const isSelected = option.id === selectedId;
                  return (
                    <CardDialogChoicePill
                      key={option.id}
                      onClick={() => {
                        onSelectionChange?.(option.id);
                      }}
                      active={isSelected}
                      size="compact"
                      className={`flex h-auto min-h-[4.25rem] w-full items-start justify-start gap-3 rounded-2xl border px-3 py-3.5 text-left md:h-auto md:min-h-[4.25rem] ${surface.borderClassName} ${surface.textPrimary}`}
                      style={{
                        background: optionFill,
                        borderColor: isSelected ? 'rgba(255,255,255,0.22)' : undefined,
                      }}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${surface.borderClassName}`}
                        style={{ background: optionFill }}
                      >
                        <Bolt
                          className={`h-4 w-4 ${isSelected ? energySurface.solarTextColor : surface.textMuted}`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{option.name}</div>
                        <div className={`mt-0.5 text-xs ${surface.textMuted}`}>
                          {option.currentPowerW > 0
                            ? `${Math.round(option.currentPowerW)}W • ${option.todayUsageKWh.toFixed(1)} kWh`
                            : `${option.todayUsageKWh.toFixed(1)} kWh`}
                        </div>
                      </div>
                    </CardDialogChoicePill>
                  );
                })}
              </div>
            </CardDialogSection>
          ))}
        </div>
      )}
    </CardDialogSection>
  );

  return (
    <BaseCardDialogWithState
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('widgets.energyNow.settings.title')}
      roomSelector={{
        value: roomValue,
        label: roomLabel,
        options: roomOptions,
        onChange: onRoomChange,
      }}
      controlsTabContent={controlsTabContent}
      tintColor={tintColor}
      onTintColorChange={onTintColorChange}
      defaultTintAccent="#f97316"
      theme={theme}
      maxWidth="sm"
      height="capped"
      bodyClassName="max-sm:min-h-0"
    />
  );
}
