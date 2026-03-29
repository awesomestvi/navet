import { AlertCircle, CheckCircle, Loader, Trash2, Zap } from 'lucide-react';
import { useId, useState } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useHomeAssistant, useI18n, useTheme } from '@/app/hooks';
import type { TranslationKey } from '@/app/i18n';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { getEnergyPrefs, mapPrefsToConfig } from '../services/energy-ha-service';
import type { EnergyDeviceSource, EnergySourceConfig } from '../types/energy.types';

interface EnergySetupPanelProps {
  initialConfig?: EnergySourceConfig;
  onSave: (config: EnergySourceConfig) => void;
  onCancel?: () => void;
}

type FormFields = Omit<EnergySourceConfig, 'devices'>;

const FIELD_META: {
  key: keyof FormFields;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  domain: string;
}[] = [
  {
    key: 'solarPowerEntityId',
    labelKey: 'energy.setup.fields.solarPower.label',
    descriptionKey: 'energy.setup.fields.solarPower.description',
    domain: 'sensor',
  },
  {
    key: 'batterySocEntityId',
    labelKey: 'energy.setup.fields.batterySoc.label',
    descriptionKey: 'energy.setup.fields.batterySoc.description',
    domain: 'sensor',
  },
  {
    key: 'batteryPowerEntityId',
    labelKey: 'energy.setup.fields.batteryPower.label',
    descriptionKey: 'energy.setup.fields.batteryPower.description',
    domain: 'sensor',
  },
  {
    key: 'gridImportPowerEntityId',
    labelKey: 'energy.setup.fields.gridImportPower.label',
    descriptionKey: 'energy.setup.fields.gridImportPower.description',
    domain: 'sensor',
  },
  {
    key: 'gridExportPowerEntityId',
    labelKey: 'energy.setup.fields.gridExportPower.label',
    descriptionKey: 'energy.setup.fields.gridExportPower.description',
    domain: 'sensor',
  },
  {
    key: 'homeLoadPowerEntityId',
    labelKey: 'energy.setup.fields.homeLoadPower.label',
    descriptionKey: 'energy.setup.fields.homeLoadPower.description',
    domain: 'sensor',
  },
  {
    key: 'solarEnergyEntityId',
    labelKey: 'energy.setup.fields.solarEnergy.label',
    descriptionKey: 'energy.setup.fields.solarEnergy.description',
    domain: 'sensor',
  },
  {
    key: 'gridImportEnergyEntityId',
    labelKey: 'energy.setup.fields.gridImportEnergy.label',
    descriptionKey: 'energy.setup.fields.gridImportEnergy.description',
    domain: 'sensor',
  },
];

function emptyFields(): FormFields {
  return {
    solarPowerEntityId: '',
    batterySocEntityId: '',
    batteryPowerEntityId: '',
    gridImportPowerEntityId: '',
    gridExportPowerEntityId: '',
    homeLoadPowerEntityId: '',
    solarEnergyEntityId: '',
    gridImportEnergyEntityId: '',
    gridExportEnergyEntityId: '',
  };
}

function configToFields(config: EnergySourceConfig): FormFields {
  return {
    solarPowerEntityId: config.solarPowerEntityId ?? '',
    batterySocEntityId: config.batterySocEntityId ?? '',
    batteryPowerEntityId: config.batteryPowerEntityId ?? '',
    gridImportPowerEntityId: config.gridImportPowerEntityId ?? '',
    gridExportPowerEntityId: config.gridExportPowerEntityId ?? '',
    homeLoadPowerEntityId: config.homeLoadPowerEntityId ?? '',
    solarEnergyEntityId: config.solarEnergyEntityId ?? '',
    gridImportEnergyEntityId: config.gridImportEnergyEntityId ?? '',
    gridExportEnergyEntityId: config.gridExportEnergyEntityId ?? '',
  };
}

export function EnergySetupPanel({ initialConfig, onSave, onCancel }: EnergySetupPanelProps) {
  const id = useId();
  const { theme, accentColor } = useTheme();
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);

  const entities = useHomeAssistant(homeAssistantSelectors.entities);
  const connected = useHomeAssistant(homeAssistantSelectors.connected);

  const [fields, setFields] = useState<FormFields>(
    initialConfig ? configToFields(initialConfig) : emptyFields()
  );
  const [devices, setDevices] = useState<EnergyDeviceSource[]>(initialConfig?.devices ?? []);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [detected, setDetected] = useState(false);

  const sensorIds = Object.keys(entities ?? {}).filter((sid) => sid.startsWith('sensor.'));

  function setField(key: keyof FormFields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function setDevicePowerEntity(index: number, value: string) {
    setDevices((prev) =>
      prev.map((d, i) => (i === index ? { ...d, powerEntityId: value || undefined } : d))
    );
  }

  function removeDevice(index: number) {
    setDevices((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAutoDetect() {
    // Use the live service connection directly — the Zustand-stored Connection
    // object may not have its prototype methods intact after state diffing.
    const liveConnection = homeAssistantService.getConnection();
    if (!liveConnection) {
      setDetectError(t('energy.setup.errors.notConnected'));
      return;
    }
    setDetecting(true);
    setDetectError(null);
    setDetected(false);
    try {
      const prefs = await getEnergyPrefs(liveConnection);
      const mapped = mapPrefsToConfig(prefs);
      setFields(configToFields(mapped));
      setDevices(mapped.devices);
      setDetected(true);
    } catch (err) {
      const detail =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : err instanceof Error
            ? err.message
            : String(err);
      setDetectError(t('energy.setup.errors.autoDetectFailed', { detail }));
    } finally {
      setDetecting(false);
    }
  }

  function handleSave() {
    const config: EnergySourceConfig = {
      ...Object.fromEntries(
        Object.entries(fields).map(([k, v]) => [k, (v as string).trim() || undefined])
      ),
      devices,
    } as EnergySourceConfig;
    onSave(config);
  }

  return (
    <div className={`rounded-3xl border p-5 md:p-6 ${surface.border} ${surface.panel}`}>
      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${accentColor}22`, color: accentColor }}
        >
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <h2 className={`text-base font-semibold ${surface.textPrimary}`}>
            {t('energy.setup.panelTitle')}
          </h2>
          <p className={`mt-1 text-sm ${surface.textSecondary}`}>
            {t('energy.setup.panelDescription')}
          </p>
        </div>
      </div>

      {/* Auto-detect */}
      <div
        className={`mt-5 flex flex-wrap items-center gap-3 rounded-2xl border p-4 ${surface.border} ${surface.panelMuted}`}
      >
        <div className="flex-1">
          <div className={`text-sm font-medium ${surface.textPrimary}`}>
            {t('energy.setup.autoDetect.title')}
          </div>
          <div className={`mt-0.5 text-xs ${surface.textMuted}`}>
            {t('energy.setup.autoDetect.description')}
          </div>
        </div>

        <button
          type="button"
          onClick={handleAutoDetect}
          disabled={detecting || !connected}
          className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: accentColor }}
        >
          {detecting && <Loader className="h-3.5 w-3.5 animate-spin" />}
          {detecting ? t('energy.setup.autoDetect.detecting') : t('energy.setup.autoDetect.action')}
        </button>

        {detected && !detectError && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <CheckCircle className="h-3.5 w-3.5" />
            {t('energy.setup.autoDetect.success')}
          </div>
        )}
        {detectError && (
          <div className="flex items-start gap-1.5 text-xs text-rose-400">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {detectError}
          </div>
        )}
      </div>

      {/* Entity ID fields */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {FIELD_META.map((meta) => {
          const inputId = `${id}-${meta.key}`;
          const listId = `${id}-${meta.key}-list`;
          return (
            <div key={meta.key}>
              <label
                htmlFor={inputId}
                className={`mb-1.5 block text-xs font-medium ${surface.textPrimary}`}
              >
                {t(meta.labelKey)}
              </label>
              <input
                id={inputId}
                type="text"
                list={listId}
                value={fields[meta.key] ?? ''}
                onChange={(e) => setField(meta.key, e.target.value)}
                placeholder={t('energy.setup.sensorPlaceholder', { domain: meta.domain })}
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none transition-colors ${surface.border} ${surface.inputBg} ${surface.textPrimary}`}
                style={{ outlineOffset: '0px' }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = accentColor;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '';
                }}
              />
              <datalist id={listId}>
                {sensorIds.map((sid) => (
                  <option key={sid} value={sid} />
                ))}
              </datalist>
              <p className={`mt-1 text-xs ${surface.textMuted}`}>{t(meta.descriptionKey)}</p>
            </div>
          );
        })}
      </div>

      {/* Individual devices */}
      {devices.length > 0 && (
        <div className="mt-6">
          <div
            className={`mb-3 text-xs font-semibold uppercase tracking-wider ${surface.textMuted}`}
          >
            {t('energy.setup.individualDevices', { count: devices.length })}
          </div>
          <div className="flex flex-col gap-2">
            {devices.map((device, index) => {
              const powerListId = `${id}-device-${index}-power-list`;
              const powerInputId = `${id}-device-${index}-power`;
              return (
                <div
                  key={device.entityId}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${surface.border} ${surface.panelMuted}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-sm font-medium ${surface.textPrimary}`}>
                      {device.name}
                    </div>
                    <div className={`truncate text-xs ${surface.textMuted}`}>{device.entityId}</div>
                  </div>
                  <div className="w-48 shrink-0">
                    <label htmlFor={powerInputId} className="sr-only">
                      {t('energy.setup.powerSensorFor', { name: device.name })}
                    </label>
                    <input
                      id={powerInputId}
                      type="text"
                      list={powerListId}
                      value={device.powerEntityId ?? ''}
                      onChange={(e) => setDevicePowerEntity(index, e.target.value)}
                      placeholder={t('energy.setup.powerSensorPlaceholder')}
                      className={`w-full rounded-xl border px-3 py-1.5 text-xs outline-none transition-colors ${surface.border} ${surface.inputBg} ${surface.textPrimary}`}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = accentColor;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '';
                      }}
                    />
                    <datalist id={powerListId}>
                      {sensorIds.map((sid) => (
                        <option key={sid} value={sid} />
                      ))}
                    </datalist>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDevice(index)}
                    className={`shrink-0 rounded-full p-1.5 transition-colors ${surface.textMuted} ${surface.hoverBg}`}
                    title={t('energy.setup.removeDevice')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-full px-5 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: accentColor }}
        >
          {t('energy.setup.saveConfiguration')}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={`rounded-full border px-5 py-2 text-sm font-medium ${surface.border} ${surface.textSecondary}`}
          >
            {t('common.cancel')}
          </button>
        )}
      </div>
    </div>
  );
}
