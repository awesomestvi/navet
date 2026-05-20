import { Sliders, Thermometer } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import {
  CardActionRow,
  CardDialogHeader,
  CardDialogTabList,
  CardDialogTabTrigger,
} from '@/app/components/patterns';
import { DialogDoneFooter, DialogShell } from '@/app/components/primitives';
import { TabPanel, Tabs } from '@/app/components/primitives/tabs';
import { CustomScrollbar, DialogSectionRow } from '@/app/components/shared/device-editor';
import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { settingsSelectors } from '@/app/stores/selectors';
import { useSettingsStore } from '@/app/stores/settings-store';
import { getEntityTypeLabel } from '@/app/utils/entity-type-label';
import {
  convertCelsiusToTemperatureUnit,
  convertTemperatureUnitToCelsius,
  formatTemperature,
  formatTemperatureValue,
} from '@/app/utils/temperature';
import { getHVACGaugeColor } from '../../utils/hvac-styles';
import { getHvacTemperatureStatusLabel } from '../../utils/hvac-temperature-status-label';
import { HVACGauge } from '../hvac-card/hvac-gauge';
import { HVACModeControls } from '../hvac-card/hvac-mode-controls';
import { HVACTempControls } from '../hvac-card/hvac-temp-controls';
import { useHvacVisualMode } from '../hvac-card/use-hvac-visual-mode';
import { getHVACSettingsDialogStyles } from './styles';
import type { HVACSettingsDialogProps } from './types';

export const HVACSettingsDialog = memo(function HVACSettingsDialog({
  entityId,
  isOpen,
  onOpenChange,
  name,
  isOn,
  mode,
  targetTemp,
  currentTemp,
  minTemp = 16,
  maxTemp = 30,
  step = 0.5,
  temperaturePresets = [{ value: 18 }, { value: 21 }, { value: 24 }],
  siblingEntities = [],
  supportedHvacModes,
  onModeChange,
  onTargetTempChange,
  onTargetTempCommit,
}: HVACSettingsDialogProps) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const temperatureUnit = useSettingsStore(settingsSelectors.temperatureUnit);
  const surface = getThemeSurfaceTokens(theme);
  const entityType = getEntityTypeLabel(entityId);
  const visualMode = useHvacVisualMode({
    currentTemp,
    isOn,
    mode,
    targetTemp,
  });
  const textTone = !isOn
    ? 'neutral'
    : visualMode === 'heat'
      ? 'orange'
      : visualMode === 'cool'
        ? 'cyan'
        : 'blue';
  const dialogTextTokens = getCardReadableTextTokens({
    theme,
    tone: textTone,
    accentColor,
  });
  const styles = getHVACSettingsDialogStyles(visualMode, isOn);
  const dialogGlowColors = getHVACGaugeColor(visualMode);
  const contentInsetClassName = 'px-6 max-sm:px-3.5';
  const [activeTab, setActiveTab] = useState('hvac');
  const displayTargetTemp = convertCelsiusToTemperatureUnit(targetTemp, temperatureUnit);
  const displayCurrentTemp = convertCelsiusToTemperatureUnit(currentTemp, temperatureUnit);
  const displayMinTemp = convertCelsiusToTemperatureUnit(minTemp, temperatureUnit);
  const displayMaxTemp = convertCelsiusToTemperatureUnit(maxTemp, temperatureUnit);
  const displayStep = Math.abs(
    convertCelsiusToTemperatureUnit(step, temperatureUnit) -
      convertCelsiusToTemperatureUnit(0, temperatureUnit)
  );
  const handleDisplayTargetTempChange = (nextTemp: number) => {
    onTargetTempChange(convertTemperatureUnitToCelsius(nextTemp, temperatureUnit));
  };
  const handleDisplayTargetTempCommit = (nextTemp: number) => {
    (onTargetTempCommit ?? onTargetTempChange)(
      convertTemperatureUnitToCelsius(nextTemp, temperatureUnit)
    );
  };

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      disableOpenAutoFocus
      overlayClassName={`animate-in fade-in ${surface.dialogBackdrop}`}
      contentClassName={`fixed top-1/2 left-1/2 z-50 h-auto max-h-[85vh] w-[90vw] max-w-[30rem] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200 ${styles.contentClassName}`}
    >
      {isOn ? (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-0 w-[78%]"
            style={{
              background: `radial-gradient(ellipse at 100% 43%, ${dialogGlowColors.secondary}70 0%, ${dialogGlowColors.primary}45 28%, ${dialogGlowColors.primary}22 48%, transparent 72%)`,
            }}
          />
          <div
            className="pointer-events-none absolute top-0 right-0 bottom-0 z-0 w-[58%]"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${dialogGlowColors.primary}18 34%, ${dialogGlowColors.secondary}38 100%)`,
            }}
          />
        </>
      ) : null}
      <CustomScrollbar isOn={isOn} className="relative z-10">
        <div className="pt-6 pb-6 max-sm:pt-2 max-sm:pb-3">
          <div className={contentInsetClassName}>
            <CardDialogHeader title={name} description={entityType} entityId={entityId} />
          </div>
          <Tabs value={activeTab} defaultValue="hvac" onValueChange={setActiveTab}>
            <div className={`relative z-20 ${contentInsetClassName}`}>
              <CardDialogTabList>
                <CardDialogTabTrigger
                  active={activeTab === 'hvac'}
                  icon={Thermometer}
                  onClick={() => setActiveTab('hvac')}
                >
                  HVAC
                </CardDialogTabTrigger>
                <CardDialogTabTrigger
                  active={activeTab === 'controls'}
                  icon={Sliders}
                  onClick={() => setActiveTab('controls')}
                >
                  Controls
                </CardDialogTabTrigger>
              </CardDialogTabList>
            </div>

            <TabPanel value="hvac" className="relative z-0 mt-1">
              <div className="-mt-8">
                <HVACGauge
                  id={entityId}
                  mode={visualMode}
                  targetTemp={displayTargetTemp}
                  currentTemp={displayCurrentTemp}
                  isOn={isOn}
                  minTemp={displayMinTemp}
                  maxTemp={displayMaxTemp}
                  step={displayStep}
                  temperatureUnit={temperatureUnit}
                  helperText={getHvacTemperatureStatusLabel(
                    t,
                    formatTemperature(targetTemp, temperatureUnit),
                    formatTemperature(currentTemp, temperatureUnit),
                    visualMode,
                    targetTemp,
                    currentTemp
                  )}
                  onTargetTempChange={handleDisplayTargetTempChange}
                  onTargetTempCommit={handleDisplayTargetTempCommit}
                  variant="immersive"
                />
              </div>
              <div className={`relative z-10 -mt-6 space-y-4 ${contentInsetClassName}`}>
                <CardActionRow
                  theme={theme}
                  size="medium"
                  leftContent={
                    <div className="flex items-center gap-2">
                      <HVACTempControls
                        targetTemp={displayTargetTemp}
                        onTempChange={handleDisplayTargetTempChange}
                        onTempCommit={handleDisplayTargetTempCommit}
                        isOn={isOn}
                        size="medium"
                        minTemp={displayMinTemp}
                        maxTemp={displayMaxTemp}
                        step={displayStep}
                      />
                      <HVACModeControls
                        mode={visualMode}
                        isOn={isOn}
                        onModeChange={onModeChange}
                        supportedHvacModes={supportedHvacModes}
                        size="medium"
                      />
                    </div>
                  }
                />

                <DialogSectionRow label={t('climate.presets')}>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {temperaturePresets.map((preset) => {
                      const isSelected = Math.abs(targetTemp - preset.value) < 0.05;

                      return (
                        <button
                          type="button"
                          key={`${preset.label ?? preset.value}`}
                          onClick={() => (onTargetTempCommit ?? onTargetTempChange)(preset.value)}
                          disabled={!isOn}
                          className={`flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-sm font-semibold transition-all duration-300 disabled:opacity-50 ${isOn ? 'hover:scale-105' : ''} ${isSelected ? `scale-105 shadow-lg ${styles.presetButtonActiveClassName}` : styles.presetButtonClassName}`}
                        >
                          <span
                            className="leading-none"
                            style={
                              isSelected
                                ? { color: dialogTextTokens.titleColor }
                                : { color: dialogTextTokens.subtitleColor }
                            }
                          >
                            {formatTemperatureValue(preset.value, temperatureUnit)}°
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </DialogSectionRow>
              </div>
            </TabPanel>

            <TabPanel value="controls" className={`relative z-0 mt-5 ${contentInsetClassName}`}>
              {siblingEntities.length > 0 ? (
                <DialogSectionRow label="Controls">
                  <div className="space-y-2">
                    {siblingEntities.map(({ id, entity }) => (
                      <ClimateSiblingControlRow
                        key={id}
                        entityId={id}
                        label={getSiblingDisplayName(id, entity.attributes?.friendly_name)}
                        typeLabel={getEntityTypeLabel(id)}
                        state={entity.state}
                      />
                    ))}
                  </div>
                </DialogSectionRow>
              ) : (
                <DialogSectionRow label="Controls">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/78">
                    No extra controls available
                  </div>
                </DialogSectionRow>
              )}
            </TabPanel>
          </Tabs>

          <div className={contentInsetClassName}>
            <DialogDoneFooter label={t('common.done')} />
          </div>
        </div>
      </CustomScrollbar>
    </DialogShell>
  );
});

function getSiblingDisplayName(entityId: string, friendlyName: unknown): string {
  if (typeof friendlyName === 'string' && friendlyName.trim().length > 0) {
    return friendlyName;
  }

  return entityId
    .replace(/^[^.]+\./, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (segment) => segment.toUpperCase());
}

function ClimateSiblingControlRow({
  entityId,
  label,
  typeLabel,
  state,
}: {
  entityId: string;
  label: string;
  typeLabel: string;
  state: string;
}) {
  const domain = entityId.split('.')[0] ?? '';
  const isToggle = domain === 'switch' || domain === 'input_boolean' || domain === 'script';
  const isOn = state === 'on';

  const handlePress = useCallback(async () => {
    if (domain === 'button' || domain === 'input_button') {
      await homeAssistantService.callService(domain, 'press', {}, { entity_id: entityId });
      return;
    }

    if (domain === 'script') {
      await homeAssistantService.callService('script', 'turn_on', {}, { entity_id: entityId });
      return;
    }

    const serviceDomain = domain === 'input_boolean' ? 'input_boolean' : 'switch';
    await homeAssistantService.callService(
      serviceDomain,
      isOn ? 'turn_off' : 'turn_on',
      {},
      { entity_id: entityId }
    );
  }, [domain, entityId, isOn]);

  return (
    <button
      type="button"
      onClick={handlePress}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-transparent bg-white/5 px-4 py-3 text-left transition-colors hover:bg-white/10"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-white">{label}</span>
        <span className="block text-xs text-white/72">{typeLabel}</span>
      </span>
      {isToggle ? (
        <div
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${isOn ? 'bg-blue-500' : 'bg-white/20'}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${isOn ? 'translate-x-5' : 'translate-x-0.5'}`}
          />
        </div>
      ) : (
        <span className="rounded-full border border-white/12 bg-white/8 px-2.5 py-1 text-xs font-medium text-white/88">
          Run
        </span>
      )}
    </button>
  );
}
