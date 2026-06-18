import { CardDialogSection, SelectableCheckboxRow } from '@navet/app/components/patterns';
import { BaseCardDialogWithState, Button } from '@navet/app/components/primitives';
import { normalizeCustomCardTint } from '@navet/app/components/shared/theme/custom-card-tint-surface';
import { getThemeColorValue } from '@navet/app/components/shared/theme/theme-colors';
import type { ProviderBatterySensorRow } from '@navet/app/hooks';
import { useI18n, useTheme } from '@navet/app/hooks';
import { useMemo } from 'react';
import { getDashboardWidgetSurfaceTokens } from './widget-surface-tokens';

interface BatterySettingsDialogProps {
  batteries: ProviderBatterySensorRow[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEntityIds?: string[];
  onSelectionChange?: (selectedEntityIds: string[]) => void;
  roomValue: string;
  roomLabel: string;
  roomOptions: Array<{ label: string; value: string }>;
  onRoomChange?: (room: string) => void;
  tintColor?: string;
  onTintColorChange?: (color: string) => void;
}

export function BatterySettingsDialog({
  batteries,
  isOpen,
  onOpenChange,
  selectedEntityIds,
  onSelectionChange,
  roomValue,
  roomLabel,
  roomOptions,
  onRoomChange,
  tintColor,
  onTintColorChange,
}: BatterySettingsDialogProps) {
  const { theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const surface = getDashboardWidgetSurfaceTokens(theme, tintColor);
  const baseSurface = getDashboardWidgetSurfaceTokens(theme);
  const rowFill = baseSurface.subtleFill;
  const accentHex = normalizeCustomCardTint(tintColor) ?? getThemeColorValue(primaryColor);
  const effectiveSelectedIds = useMemo(
    () => selectedEntityIds ?? batteries.map((battery) => battery.id),
    [batteries, selectedEntityIds]
  );
  const selectedIdSet = useMemo(() => new Set(effectiveSelectedIds), [effectiveSelectedIds]);

  const updateSelection = (nextSelectedIds: string[]) => {
    onSelectionChange?.(nextSelectedIds);
  };

  const handleToggle = (batteryId: string) => {
    if (!onSelectionChange) {
      return;
    }

    const nextSelectedIds = selectedIdSet.has(batteryId)
      ? effectiveSelectedIds.filter((id) => id !== batteryId)
      : [...effectiveSelectedIds, batteryId];

    updateSelection(nextSelectedIds);
  };

  const controlsTabContent = (
    <CardDialogSection
      label={t('widgets.battery.settings.sensors')}
      helperText={t('widgets.battery.settings.help')}
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          <Button
            onClick={() => updateSelection(batteries.map((battery) => battery.id))}
            variant="soft"
            size="compact"
            className={surface.textSecondary}
          >
            {t('widgets.battery.settings.selectAll')}
          </Button>
          <Button
            onClick={() => updateSelection([])}
            variant="soft"
            size="compact"
            className={surface.textSecondary}
          >
            {t('widgets.battery.settings.clearAll')}
          </Button>
        </div>

        {batteries.length === 0 ? (
          <p
            className={`rounded-2xl border px-4 py-4 text-sm ${surface.borderClassName} ${surface.textMuted}`}
          >
            {t('widgets.battery.settings.noneAvailable')}
          </p>
        ) : (
          <ul className="max-h-72 min-w-0 max-w-full space-y-1.5 overflow-x-hidden overflow-y-auto pr-1">
            {batteries.map((battery) => {
              const isChecked = selectedIdSet.has(battery.id);
              return (
                <li key={battery.id} className="w-full min-w-0 max-w-full">
                  <SelectableCheckboxRow
                    checked={isChecked}
                    onCheckedChange={() => handleToggle(battery.id)}
                    label={
                      <span className="block truncate" title={battery.name}>
                        {battery.name}
                      </span>
                    }
                    description={battery.id}
                    trailing={
                      <div className="text-sm font-semibold tabular-nums">{battery.level}%</div>
                    }
                    rowClassName={`w-full min-w-0 max-w-full overflow-hidden ${surface.borderClassName} ${surface.textPrimary}`}
                    labelClassName="truncate"
                    descriptionClassName={`whitespace-normal break-all ${surface.textMuted}`}
                    checkboxPaletteColor={accentHex}
                    style={{ background: rowFill }}
                    selectedStyle={{
                      background: rowFill,
                      borderColor: `${accentHex}4d`,
                    }}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </CardDialogSection>
  );

  return (
    <BaseCardDialogWithState
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('widgets.battery.settings.title')}
      description={t('widgets.common.widget')}
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
      maxWidth="md"
      height="capped"
      scrollClassName="max-h-[85vh] w-full min-w-0"
      bodyClassName="max-h-[85vh] w-full min-w-0"
    />
  );
}
