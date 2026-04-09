import * as Dialog from '@radix-ui/react-dialog';
import { Palette, Sliders, X } from 'lucide-react';
import { useState } from 'react';
import {
  customCardDialogShellProps,
  DialogDoneFooter,
  DialogShell,
} from '@/app/components/primitives/dialog-shell';
import { InteractivePill } from '@/app/components/primitives/interactive-pill';
import { TabPanel, Tabs } from '@/app/components/primitives/tabs';
import {
  CustomCardTintPicker,
  CustomScrollbar,
  DialogSectionRow,
} from '@/app/components/shared/device-editor';
import { EntityRoomSelector } from '@/app/components/shared/entity-room-selector';
import { getAccentCardShellTokens } from '@/app/components/shared/theme/accent-card-shell-tokens';
import {
  getCustomCardTintSurface,
  getInheritedDialogSectionStyle,
  normalizeCustomCardTint,
} from '@/app/components/shared/theme/custom-card-tint-surface';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';
import type { WeatherForecastMode } from '@/app/stores/settings-store';

interface WeatherSettingsDialogProps {
  entityId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  theme: ThemeType;
  title: string;
  forecastMode: WeatherForecastMode;
  onForecastModeChange: (mode: WeatherForecastMode) => void;
  tintColor?: string;
  onTintColorChange?: (color: string) => void;
}

export function WeatherSettingsDialog({
  entityId,
  isOpen,
  onOpenChange,
  theme,
  title,
  forecastMode,
  onForecastModeChange,
  tintColor,
  onTintColorChange,
}: WeatherSettingsDialogProps) {
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const shell = getAccentCardShellTokens(theme, 'blue');
  const isOn = theme !== 'light';
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const resolvedTintColor = normalizeCustomCardTint(tintColor);
  const activeAccentColor = resolvedTintColor ?? '#3b82f6';
  const dialogShell = customCardDialogShellProps(surface, tintSurface, {
    fallbackDecoration: {
      glowClassName: shell.glowClassName,
      overlayClassName: shell.overlayClassName,
    },
    fallbackContentClassName: `fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-xl ${shell.containerClassName}`,
  });
  const sectionStyle = getInheritedDialogSectionStyle(theme, tintColor, '#3b82f6');
  const [activeTab, setActiveTab] = useState('controls');

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
      <CustomScrollbar isOn={isOn}>
        <div className="p-8">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <EntityRoomSelector entityId={entityId} compact forceDark />
              <h2 className="mt-2 text-xl font-semibold text-white">{title}</h2>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-white/10 bg-white/6 p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                aria-label={t('common.close')}
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <Tabs value={activeTab} defaultValue="controls" onValueChange={setActiveTab}>
            <div className="mt-1 inline-flex items-center gap-1">
              <InteractivePill
                active={activeTab === 'controls'}
                size="compact"
                className="min-h-8 px-3 text-[11px]"
                icon={Sliders}
                onClick={() => setActiveTab('controls')}
              >
                Controls
              </InteractivePill>
              {onTintColorChange ? (
                <InteractivePill
                  active={activeTab === 'card'}
                  size="compact"
                  className="min-h-8 px-3 text-[11px]"
                  icon={Palette}
                  onClick={() => setActiveTab('card')}
                >
                  Card
                </InteractivePill>
              ) : null}
            </div>

            <TabPanel value="controls" className="mt-5">
              <DialogSectionRow label={t('weather.settings.forecast')} className="mb-4">
                <div className="grid grid-cols-2 gap-2">
                  {(['hourly', 'weekly'] as const).map((option) => {
                    const isSelected = forecastMode === option;

                    return (
                      <button
                        type="button"
                        key={option}
                        onClick={() => onForecastModeChange(option)}
                        className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
                          isSelected
                            ? 'text-white'
                            : `${surface.border} ${surface.textPrimary} ${surface.hoverBg}`
                        }`}
                        style={
                          isSelected
                            ? {
                                backgroundColor: activeAccentColor,
                                borderColor: activeAccentColor,
                              }
                            : sectionStyle
                        }
                      >
                        {option === 'hourly'
                          ? t('weather.settings.hourly')
                          : t('weather.settings.weekly')}
                      </button>
                    );
                  })}
                </div>
              </DialogSectionRow>
            </TabPanel>

            {onTintColorChange ? (
              <TabPanel value="card" className="mt-5">
                <CustomCardTintPicker
                  value={tintColor}
                  onChange={onTintColorChange}
                  isOn={isOn}
                  defaultColor="#3b82f6"
                />
              </TabPanel>
            ) : null}
          </Tabs>

          <DialogDoneFooter label={t('common.done')} />
        </div>
      </CustomScrollbar>
    </DialogShell>
  );
}
