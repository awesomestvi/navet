import { Palette, Sliders } from 'lucide-react';
import { useState } from 'react';
import {
  CardDialogHeader,
  CardDialogSection,
  CardDialogTabList,
  CardDialogTabTrigger,
} from '@/app/components/patterns';
import {
  customCardDialogShellProps,
  DialogDoneFooter,
  DialogShell,
} from '@/app/components/primitives';
import { TabPanel, Tabs } from '@/app/components/primitives/tabs';
import { CustomCardTintPicker, CustomScrollbar } from '@/app/components/shared/device-editor';
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
import { getEntityTypeLabel } from '@/app/utils/entity-type-label';

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
  const entityType = getEntityTypeLabel(entityId);
  const shell = getAccentCardShellTokens(theme, 'blue');
  const isOn = theme !== 'light';
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const resolvedTintColor = normalizeCustomCardTint(tintColor);
  const activeAccentColor = resolvedTintColor ?? '#3b82f6';
  const dialogShell = customCardDialogShellProps(surface, tintSurface, {
    padding: false,
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
        <div className="p-6">
          <CardDialogHeader title={title} description={entityType} entityId={entityId} />

          <Tabs value={activeTab} defaultValue="controls" onValueChange={setActiveTab}>
            <CardDialogTabList>
              <CardDialogTabTrigger
                active={activeTab === 'controls'}
                icon={Sliders}
                onClick={() => setActiveTab('controls')}
              >
                Controls
              </CardDialogTabTrigger>
              {onTintColorChange ? (
                <CardDialogTabTrigger
                  active={activeTab === 'card'}
                  icon={Palette}
                  onClick={() => setActiveTab('card')}
                >
                  Customize
                </CardDialogTabTrigger>
              ) : null}
            </CardDialogTabList>

            <TabPanel value="controls" className="mt-5">
              <CardDialogSection label={t('weather.settings.forecast')} className="mb-4">
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
              </CardDialogSection>
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
