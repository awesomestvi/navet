import {
  CardDialogBody,
  CardDialogChoicePill,
  CardDialogDoneFooter,
  CardDialogHeader,
  CardDialogSection,
  CardDialogTabList,
  CardDialogTabTrigger,
} from '@navet/app/components/patterns';
import { customCardDialogShellProps, DialogShell } from '@navet/app/components/primitives';
import { TabPanel, Tabs } from '@navet/app/components/primitives/tabs';
import {
  CompactRoomSelector,
  CustomCardTintPicker,
  CustomScrollbar,
} from '@navet/app/components/shared/device-editor';
import { getCustomCardTintSurface } from '@navet/app/components/shared/theme/custom-card-tint-surface';
import { getEnergyNowWidgetSurfaceTokens } from '@navet/app/components/shared/theme/energy-widget-surface-tokens';
import { useI18n } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { Bolt, Palette, Sliders } from 'lucide-react';
import { useState } from 'react';
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
  const energySurface = getEnergyNowWidgetSurfaceTokens(theme);
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const dialogShell = customCardDialogShellProps(
    { panel: surface.panelClassName, border: surface.borderClassName },
    tintSurface,
    {
      maxWidth: 'sm',
      padding: false,
      height: 'capped',
    }
  );
  const selectedId = selectedSourceId;
  const [activeTab, setActiveTab] = useState<'controls' | 'card'>('controls');

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      disableOpenAutoFocus
      overlayClassName={surface.dialogBackdrop}
      contentClassName={dialogShell.contentClassName}
      contentStyle={dialogShell.contentStyle}
      contentGlowClassName={dialogShell.contentGlowClassName}
      contentGlowStyle={dialogShell.contentGlowStyle}
      contentOverlayClassName={dialogShell.contentOverlayClassName}
    >
      <CustomScrollbar isOn={theme !== 'light'}>
        <CardDialogBody>
          <CardDialogHeader
            title={t('widgets.energyNow.settings.title')}
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
                      <div key={group.key} className="space-y-2">
                        <div
                          className={`text-xs font-semibold uppercase tracking-[0.16em] ${surface.textMuted}`}
                        >
                          {group.label}
                        </div>
                        <div className="space-y-2">
                          {group.items.map((option) => {
                            const isSelected = option.id === selectedId;
                            const selectedBackground =
                              typeof surface.panelStyle?.background === 'string'
                                ? surface.panelStyle.background
                                : surface.subtleFill;
                            return (
                              <CardDialogChoicePill
                                key={option.id}
                                onClick={() => {
                                  onSelectionChange?.(option.id);
                                }}
                                active={isSelected}
                                className={`flex h-auto w-full items-center justify-start gap-3 rounded-2xl border px-3 py-3 text-left ${surface.borderClassName} ${surface.textPrimary}`}
                                style={{
                                  background: isSelected ? selectedBackground : surface.subtleFill,
                                }}
                              >
                                <div
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${surface.borderClassName}`}
                                  style={{ background: surface.subtleFill }}
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
                      </div>
                    ))}
                  </div>
                )}
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

          <CardDialogDoneFooter label={t('common.done')} />
        </CardDialogBody>
      </CustomScrollbar>
    </DialogShell>
  );
}
