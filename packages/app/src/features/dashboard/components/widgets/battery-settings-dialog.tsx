import {
  CardDialogBody,
  CardDialogHeader,
  CardDialogSection,
  CardDialogTabList,
  CardDialogTabTrigger,
  SelectableCheckboxRow,
} from '@navet/app/components/patterns';
import {
  Button,
  customCardDialogShellProps,
  DialogDoneFooter,
  DialogShell,
} from '@navet/app/components/primitives';
import { TabPanel, Tabs } from '@navet/app/components/primitives/tabs';
import { CompactRoomSelector } from '@navet/app/components/shared/device-editor/compact-room-selector';
import { CustomCardTintPicker } from '@navet/app/components/shared/device-editor/custom-card-tint-picker';
import {
  getCustomCardTintSurface,
  normalizeCustomCardTint,
} from '@navet/app/components/shared/theme/custom-card-tint-surface';
import { getThemeColorValue } from '@navet/app/components/shared/theme/theme-colors';
import type { ProviderBatterySensorRow } from '@navet/app/hooks';
import { useI18n, useTheme } from '@navet/app/hooks';
import { Palette, Sliders } from 'lucide-react';
import { useMemo, useState } from 'react';
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
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const accentHex = normalizeCustomCardTint(tintColor) ?? getThemeColorValue(primaryColor);
  const dialogShell = customCardDialogShellProps(
    { panel: surface.panelClassName, border: surface.borderClassName },
    tintSurface,
    {
      maxWidth: 'md',
      padding: false,
      height: 'capped',
    }
  );
  const effectiveSelectedIds = useMemo(
    () => selectedEntityIds ?? batteries.map((battery) => battery.id),
    [batteries, selectedEntityIds]
  );
  const selectedIdSet = useMemo(() => new Set(effectiveSelectedIds), [effectiveSelectedIds]);
  const [activeTab, setActiveTab] = useState<'controls' | 'card'>('controls');

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

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      disableOpenAutoFocus
      contentAriaDescribedBy={undefined}
      overlayClassName={surface.dialogBackdrop}
      contentClassName={dialogShell.contentClassName}
      contentStyle={dialogShell.contentStyle}
      contentGlowClassName={dialogShell.contentGlowClassName}
      contentGlowStyle={dialogShell.contentGlowStyle}
      contentOverlayClassName={dialogShell.contentOverlayClassName}
    >
      <div className="max-h-[85vh] w-full min-w-0 overflow-y-auto">
        <CardDialogBody>
          <CardDialogHeader
            title={t('widgets.battery.settings.title')}
            description={t('widgets.common.widget')}
            showRoomSelector={false}
            eyebrow={
              <CompactRoomSelector
                value={roomValue}
                label={roomLabel}
                options={roomOptions}
                onChange={onRoomChange}
              />
            }
          />

          <Tabs
            value={activeTab}
            defaultValue="controls"
            onValueChange={(value) => setActiveTab(value as 'controls' | 'card')}
          >
            <CardDialogTabList>
              <CardDialogTabTrigger
                active={activeTab === 'controls'}
                icon={Sliders}
                onClick={() => setActiveTab('controls')}
              >
                {t('common.controls')}
              </CardDialogTabTrigger>
              {onTintColorChange ? (
                <CardDialogTabTrigger
                  active={activeTab === 'card'}
                  icon={Palette}
                  onClick={() => setActiveTab('card')}
                >
                  {t('common.customize')}
                </CardDialogTabTrigger>
              ) : null}
            </CardDialogTabList>

            <TabPanel value="controls" className="mt-5">
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
                                <div className="text-sm font-semibold tabular-nums">
                                  {battery.level}%
                                </div>
                              }
                              rowClassName={`w-full min-w-0 max-w-full overflow-hidden ${surface.borderClassName} ${surface.textPrimary}`}
                              labelClassName="truncate"
                              descriptionClassName={`whitespace-normal break-all ${surface.textMuted}`}
                              checkboxPaletteColor={accentHex}
                              style={{ background: surface.subtleFill }}
                              selectedStyle={{
                                background: surface.subtleFill,
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
            </TabPanel>

            {onTintColorChange ? (
              <TabPanel value="card" className="mt-5">
                <CustomCardTintPicker
                  value={tintColor}
                  onChange={onTintColorChange}
                  defaultColor="#f97316"
                  className={surface.textMuted}
                />
              </TabPanel>
            ) : null}
          </Tabs>

          <DialogDoneFooter label={t('common.done')} />
        </CardDialogBody>
      </div>
    </DialogShell>
  );
}
