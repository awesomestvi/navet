import { AlertCircle, Plus, Sparkles, Trash2, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { FieldBlock } from '@/app/components/patterns';
import {
  Badge,
  BaseCard,
  Button,
  Panel,
  Select,
  Stepper,
  Switch,
} from '@/app/components/primitives';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useHomeAssistant, useI18n, useTheme } from '@/app/hooks';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { useEnergyEntityOptions } from '../../hooks/use-energy-entity-options';
import { getEnergyPrefs, mapPrefsToConfig } from '../../services/energy-ha-service';
import type { EnergySourceConfig } from '../../types/energy.types';
import { EnergyQualityBar } from '../charts/energy-quality-bar';
import { EnergyEntityPicker } from './energy-entity-picker';
import {
  buildConfigFromDraft,
  createEnergySetupDraft,
  ENERGY_DEVICE_CATEGORY_OPTIONS,
  getEnergyCategoryLabel,
  hasCompleteEssentials,
  mergeDetectedConfigIntoDraft,
  scoreEnergySetupDraft,
} from './energy-setup-wizard.helpers';

interface EnergySetupWizardProps {
  initialConfig?: EnergySourceConfig;
  onSave: (config: EnergySourceConfig) => void;
  onCancel?: () => void;
}

const STEP_ITEMS = [
  { id: 'essentials', label: 'Essentials' },
  { id: 'sources', label: 'Extra sources', optional: true },
  { id: 'devices', label: 'Device tracking', optional: true },
];

export function EnergySetupWizard({ initialConfig, onSave, onCancel }: EnergySetupWizardProps) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const connected = useHomeAssistant(homeAssistantSelectors.connected);
  const { powerOptions, energyStatOptions, batteryOptions } = useEnergyEntityOptions();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() => createEnergySetupDraft(initialConfig));
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [detectSuccess, setDetectSuccess] = useState(false);
  const [pendingDeviceEntityId, setPendingDeviceEntityId] = useState('');

  const quality = useMemo(() => scoreEnergySetupDraft(draft), [draft]);
  const essentialsComplete = useMemo(() => hasCompleteEssentials(draft), [draft]);
  const pendingDeviceOption = energyStatOptions.find(
    (option) => option.value === pendingDeviceEntityId
  );

  function setField(key: keyof typeof draft.fields, value: string) {
    setDraft((previousDraft) => ({
      ...previousDraft,
      fields: {
        ...previousDraft.fields,
        [key]: value,
      },
    }));
  }

  function setDeviceField(
    entityId: string,
    key: 'category' | 'powerEntityId',
    value: string | undefined
  ) {
    setDraft((previousDraft) => ({
      ...previousDraft,
      devices: previousDraft.devices.map((device) =>
        device.entityId === entityId ? { ...device, [key]: value } : device
      ),
    }));
  }

  function removeDevice(entityId: string) {
    setDraft((previousDraft) => ({
      ...previousDraft,
      devices: previousDraft.devices.filter((device) => device.entityId !== entityId),
    }));
  }

  function addDevice() {
    if (!pendingDeviceOption) {
      return;
    }

    setDraft((previousDraft) => {
      if (previousDraft.devices.some((device) => device.entityId === pendingDeviceOption.value)) {
        return previousDraft;
      }

      return {
        ...previousDraft,
        devices: [
          ...previousDraft.devices,
          {
            entityId: pendingDeviceOption.value,
            name: pendingDeviceOption.label,
            category: 'other',
          },
        ],
      };
    });
    setPendingDeviceEntityId('');
  }

  async function handleAutoDetect() {
    const liveConnection = homeAssistantService.getConnection();
    if (!liveConnection) {
      setDetectError(t('energy.setup.errors.notConnected'));
      setDetectSuccess(false);
      return;
    }

    setDetecting(true);
    setDetectError(null);
    setDetectSuccess(false);

    try {
      const prefs = await getEnergyPrefs(liveConnection);
      const mapped = mapPrefsToConfig(prefs);
      setDraft((previousDraft) => mergeDetectedConfigIntoDraft(previousDraft, mapped));
      setDetectSuccess(true);
    } catch (error) {
      const detail =
        error instanceof Error && error.message.trim().length > 0 ? error.message : String(error);
      setDetectError(t('energy.setup.errors.autoDetectFailed', { detail }));
    } finally {
      setDetecting(false);
    }
  }

  function handleSave() {
    onSave(buildConfigFromDraft(draft));
  }

  function renderProgressBand() {
    return (
      <Panel muted className="border-b px-5 py-4 md:px-6 md:py-5" padded={false}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div
              className={`mb-2 text-xs font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
            >
              Setup progress
            </div>
            <Stepper items={STEP_ITEMS} currentStep={step} />
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Badge tone="accent">
              Step {step + 1} of {STEP_ITEMS.length}
            </Badge>
            <Badge tone={connected ? 'success' : 'warning'}>
              {connected ? 'Connected' : 'Offline'}
            </Badge>
          </div>
        </div>
      </Panel>
    );
  }

  function renderHero() {
    return (
      <div className="space-y-4">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
        >
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <div className={`text-xs font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}>
            Energy
          </div>
          <h2
            className={`mt-3 text-3xl font-semibold tracking-tight md:text-4xl ${surface.textPrimary}`}
          >
            Set up energy with less noise.
          </h2>
          <p className={`mt-4 max-w-2xl text-sm leading-6 md:text-base ${surface.textSecondary}`}>
            Start with the three signals that make the dashboard useful, then add richer sources and
            tracked devices only if you want them.
          </p>
        </div>
      </div>
    );
  }

  function renderQualityCard(className = '') {
    return (
      <Panel muted className={`space-y-4 ${className}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className={`text-lg font-semibold ${surface.textPrimary}`}>
              Configuration quality
            </div>
            <div className={`mt-1 text-sm ${surface.textSecondary}`}>
              {quality.score}% confidence
            </div>
          </div>
          <Sparkles className={`mt-1 h-4 w-4 ${surface.textMuted}`} />
        </div>
        <Badge tone={quality.tone}>{quality.label}</Badge>
        <EnergyQualityBar value={quality.score} accentColor={accentColor} label="quality score" />
      </Panel>
    );
  }

  function renderEssentialsStep() {
    return (
      <div className="space-y-8">
        <Panel className="space-y-4 px-5 py-5 md:px-6 md:py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className={`text-lg font-semibold ${surface.textPrimary}`}>
                Auto-detect from Home Assistant
              </div>
              <p className={`mt-2 text-sm leading-6 ${surface.textSecondary}`}>
                Pull in Home Assistant Energy preferences first, then review anything that still
                needs manual attention.
              </p>
            </div>
            <Button
              variant="primary"
              loading={detecting}
              disabled={!connected}
              onClick={handleAutoDetect}
              className="lg:self-center"
            >
              Auto-detect
            </Button>
          </div>

          {detectSuccess ? <Badge tone="success">Filled from Home Assistant</Badge> : null}
          {detectError ? (
            <div className="flex items-start gap-2 text-sm text-rose-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{detectError}</span>
            </div>
          ) : null}
        </Panel>

        <section className="space-y-8">
          <div className="space-y-3">
            <div className={`text-xl font-semibold tracking-tight ${surface.textPrimary}`}>
              Essentials
            </div>
            <p className={`max-w-2xl text-sm leading-6 ${surface.textSecondary}`}>
              These three signals establish a reliable baseline for the energy dashboard and keep
              the first step calm.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <EnergyEntityPicker
              label={t('energy.setup.fields.homeLoadPower.label')}
              hint={t('energy.setup.fields.homeLoadPower.description')}
              placeholder="Search current power"
              value={draft.fields.homeLoadPowerEntityId}
              options={powerOptions}
              onChange={(value) => setField('homeLoadPowerEntityId', value)}
              emptyMessage="No power sensors match."
            />
            <EnergyEntityPicker
              label={t('energy.setup.fields.gridImportPower.label')}
              hint={t('energy.setup.fields.gridImportPower.description')}
              placeholder="Search grid import"
              value={draft.fields.gridImportPowerEntityId}
              options={powerOptions}
              onChange={(value) => setField('gridImportPowerEntityId', value)}
              emptyMessage="No grid import sensors match."
            />
            <EnergyEntityPicker
              label={t('energy.setup.fields.gridImportEnergy.label')}
              hint={t('energy.setup.fields.gridImportEnergy.description')}
              placeholder="Search total consumed today"
              value={draft.fields.gridImportEnergyEntityId}
              options={energyStatOptions}
              onChange={(value) => setField('gridImportEnergyEntityId', value)}
              emptyMessage="No energy statistics sensors match."
            />
          </div>
        </section>
      </div>
    );
  }

  function renderSourceCard(
    title: string,
    description: string,
    checked: boolean,
    onCheckedChange: (nextValue: boolean) => void,
    fields: ReactNode
  ) {
    return (
      <BaseCard size="small" surfaceVariant="muted" className="h-full">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={`text-base font-semibold ${surface.textPrimary}`}>{title}</div>
              <p className={`mt-1 text-sm leading-6 ${surface.textMuted}`}>{description}</p>
            </div>
            <Switch
              checked={checked}
              onCheckedChange={onCheckedChange}
              aria-label={`Enable ${title}`}
            />
          </div>
          {checked ? fields : <Badge tone="neutral">Not enabled</Badge>}
        </div>
      </BaseCard>
    );
  }

  function renderSourcesStep() {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        {renderSourceCard(
          'Solar',
          'Add production and solar-today readings so the flow map and trend views can see generation clearly.',
          draft.solarEnabled,
          (nextValue) =>
            setDraft((previousDraft) => ({ ...previousDraft, solarEnabled: nextValue })),
          <div className="space-y-4">
            <EnergyEntityPicker
              label={t('energy.setup.fields.solarPower.label')}
              hint={t('energy.setup.fields.solarPower.description')}
              placeholder="Search solar power"
              value={draft.fields.solarPowerEntityId}
              options={powerOptions}
              onChange={(value) => setField('solarPowerEntityId', value)}
              emptyMessage="No solar power sensors match."
            />
            <EnergyEntityPicker
              label={t('energy.setup.fields.solarEnergy.label')}
              hint={t('energy.setup.fields.solarEnergy.description')}
              placeholder="Search solar energy"
              value={draft.fields.solarEnergyEntityId}
              options={energyStatOptions}
              onChange={(value) => setField('solarEnergyEntityId', value)}
              emptyMessage="No solar energy statistics sensors match."
            />
          </div>
        )}

        {renderSourceCard(
          'Battery',
          'Add battery state of charge and power to unlock storage context without forcing it into the essentials step.',
          draft.batteryEnabled,
          (nextValue) =>
            setDraft((previousDraft) => ({ ...previousDraft, batteryEnabled: nextValue })),
          <div className="space-y-4">
            <EnergyEntityPicker
              label={t('energy.setup.fields.batterySoc.label')}
              hint={t('energy.setup.fields.batterySoc.description')}
              placeholder="Search battery charge"
              value={draft.fields.batterySocEntityId}
              options={batteryOptions}
              onChange={(value) => setField('batterySocEntityId', value)}
              emptyMessage="No battery charge sensors match."
            />
            <EnergyEntityPicker
              label={t('energy.setup.fields.batteryPower.label')}
              hint={t('energy.setup.fields.batteryPower.description')}
              placeholder="Search battery power"
              value={draft.fields.batteryPowerEntityId}
              options={powerOptions}
              onChange={(value) => setField('batteryPowerEntityId', value)}
              emptyMessage="No battery power sensors match."
            />
          </div>
        )}
      </div>
    );
  }

  function renderDevicesStep() {
    return (
      <div className="space-y-5">
        <Panel muted className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className={`text-sm font-semibold ${surface.textPrimary}`}>
                Track important devices
              </div>
              <p className={`mt-1 text-xs leading-5 ${surface.textMuted}`}>
                Add daily energy entities first. You can attach a live power sensor afterward if you
                want the top-consumers view to feel more alive.
              </p>
            </div>
            <Badge tone="accent">{draft.devices.length} devices</Badge>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <EnergyEntityPicker
              label="Tracked device"
              hint="Pick the cumulative energy/statistics entity that represents the device."
              placeholder="Search device energy"
              value={pendingDeviceEntityId}
              options={energyStatOptions}
              onChange={setPendingDeviceEntityId}
              emptyMessage="No device energy sensors match."
            />
            <div className="flex items-end">
              <Button
                variant="secondary"
                leading={<Plus className="h-4 w-4" />}
                disabled={!pendingDeviceOption}
                onClick={addDevice}
              >
                Add device
              </Button>
            </div>
          </div>
        </Panel>

        {draft.devices.length > 0 ? (
          <div className="grid gap-4">
            {draft.devices.map((device) => (
              <BaseCard key={device.entityId} size="small" surfaceVariant="muted">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className={`truncate text-base font-semibold ${surface.textPrimary}`}>
                        {device.name}
                      </div>
                      <div className={`truncate text-xs ${surface.textMuted}`}>
                        {device.entityId}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="compact"
                      iconOnly
                      label={t('energy.setup.removeDevice')}
                      onClick={() => removeDevice(device.entityId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <FieldBlock
                      label="Category"
                      hint="Choose how this device should be grouped in the energy views."
                    >
                      <Select
                        value={device.category}
                        onChange={(event) =>
                          setDeviceField(
                            device.entityId,
                            'category',
                            event.target.value as EnergySourceConfig['devices'][number]['category']
                          )
                        }
                        selectClassName={`${surface.border} ${surface.inputBg} ${surface.textPrimary}`}
                      >
                        {ENERGY_DEVICE_CATEGORY_OPTIONS.map((category) => (
                          <option key={category} value={category}>
                            {getEnergyCategoryLabel(category)}
                          </option>
                        ))}
                      </Select>
                    </FieldBlock>

                    <EnergyEntityPicker
                      label="Live power sensor"
                      hint="Optional. Attach a live power sensor to improve real-time device rankings."
                      placeholder="Search power sensor"
                      value={device.powerEntityId ?? ''}
                      options={powerOptions}
                      onChange={(value) => setDeviceField(device.entityId, 'powerEntityId', value)}
                      emptyMessage="No power sensors match."
                    />
                  </div>
                  {device.powerEntityId ? (
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="compact"
                        onClick={() => setDeviceField(device.entityId, 'powerEntityId', undefined)}
                      >
                        Clear power sensor
                      </Button>
                    </div>
                  ) : null}
                </div>
              </BaseCard>
            ))}
          </div>
        ) : (
          <Panel muted className={`text-sm ${surface.textMuted}`}>
            No tracked devices yet. Add one when you want per-device energy cards and rankings.
          </Panel>
        )}
      </div>
    );
  }

  function renderFooter() {
    const onPrimaryAction =
      step < 2 ? () => setStep((previousStep) => previousStep + 1) : handleSave;
    const primaryLabel = step < 2 ? 'Continue' : 'Save';
    const primaryDisabled = step === 0 ? !essentialsComplete : false;

    return (
      <div
        className={`sticky bottom-0 -mx-6 mt-12 border-t px-6 py-4 backdrop-blur-2xl md:-mx-10 md:px-10 ${surface.border}`}
        style={{
          paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
          backgroundColor:
            theme === 'light'
              ? 'rgba(255,255,255,0.84)'
              : theme === 'black'
                ? 'rgba(0,0,0,0.82)'
                : 'rgba(24,24,27,0.82)',
          boxShadow: '0 -18px 40px rgba(0,0,0,0.16)',
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {step > 0 ? (
              <Button
                variant="secondary"
                onClick={() => setStep((previousStep) => previousStep - 1)}
              >
                Back
              </Button>
            ) : null}
            {onCancel ? (
              <Button variant="ghost" onClick={onCancel}>
                {t('common.cancel')}
              </Button>
            ) : null}
          </div>

          <Button variant="primary" disabled={primaryDisabled} onClick={onPrimaryAction}>
            {primaryLabel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-8">
      {renderProgressBand()}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <Panel
          as="article"
          className={`mx-auto w-full max-w-5xl shadow-[0_24px_70px_rgba(0,0,0,0.16)]`}
          padded={false}
        >
          <div className="space-y-12 px-6 py-8 md:px-10 md:py-10">
            {renderHero()}

            <div className="xl:hidden">{renderQualityCard()}</div>

            <div className="space-y-12">
              {step === 0
                ? renderEssentialsStep()
                : step === 1
                  ? renderSourcesStep()
                  : renderDevicesStep()}
            </div>
          </div>

          {renderFooter()}
        </Panel>

        <aside className="hidden xl:block xl:pt-24">
          <div className="sticky top-6">{renderQualityCard()}</div>
        </aside>
      </div>
    </section>
  );
}
