import { Check, Palette, Sliders, ToggleLeft } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import {
  CardDialogHeader,
  CardDialogTabList,
  CardDialogTabTrigger,
} from '@/app/components/patterns';
import { DialogDoneFooter, DialogShell } from '@/app/components/primitives';
import { TabPanel, Tabs } from '@/app/components/primitives/tabs';
import {
  CustomCardTintPicker,
  CustomScrollbar,
  DialogSectionRow,
  IconPicker,
} from '@/app/components/shared/device-editor';
import { resolvePrimaryColorToken } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import type { DeviceMetric } from '@/app/types/device.types';
import { getEntityTypeLabel } from '@/app/utils/entity-type-label';
import type { SwitchSiblingEntity } from './use-switch-card-controller';

interface SwitchSettingsDialogProps {
  entityId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  entityType: string;
  isOn: boolean;
  metricSectionTitle: string;
  metricSectionDescription: string;
  availableMetrics: DeviceMetric[];
  selectedMetricLabels: string[];
  formatMetricValue: (metric: DeviceMetric) => string | null;
  getMetricLabel: (metric: DeviceMetric) => string;
  onMetricToggle: (label: string) => void;
  selectedIcon: string;
  onIconChange: (iconName: string) => void;
  siblingEntities: SwitchSiblingEntity[];
  tintColor: string;
  onTintColorChange: (color: string) => void;
}

const colorMap = {
  orange: { from: 'from-orange-900/95', to: 'to-orange-950/95', border: 'border-orange-500/20' },
  blue: { from: 'from-blue-900/95', to: 'to-blue-950/95', border: 'border-blue-500/20' },
  green: { from: 'from-green-900/95', to: 'to-green-950/95', border: 'border-green-500/20' },
  purple: { from: 'from-purple-900/95', to: 'to-purple-950/95', border: 'border-purple-500/20' },
  pink: { from: 'from-pink-900/95', to: 'to-pink-950/95', border: 'border-pink-500/20' },
  red: { from: 'from-red-900/95', to: 'to-red-950/95', border: 'border-red-500/20' },
  yellow: { from: 'from-yellow-900/95', to: 'to-yellow-950/95', border: 'border-yellow-500/20' },
  teal: { from: 'from-teal-900/95', to: 'to-teal-950/95', border: 'border-teal-500/20' },
} as const;

export const SwitchSettingsDialog = memo(function SwitchSettingsDialog({
  entityId,
  isOpen,
  onOpenChange,
  name,
  entityType,
  isOn,
  metricSectionTitle,
  metricSectionDescription,
  availableMetrics,
  selectedMetricLabels,
  formatMetricValue,
  getMetricLabel,
  onMetricToggle,
  selectedIcon,
  onIconChange,
  siblingEntities,
  tintColor,
  onTintColorChange,
}: SwitchSettingsDialogProps) {
  const { primaryColor, theme } = useTheme();
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const hasControls = siblingEntities.length > 0;
  const hasMetrics = availableMetrics.length > 0;
  const [activeTab, setActiveTab] = useState(
    hasControls ? 'controls' : hasMetrics ? 'metrics' : 'card'
  );

  const activeDialogColors = colorMap[resolvePrimaryColorToken(primaryColor)];
  const gradientClassName = isOn
    ? `bg-linear-to-br ${activeDialogColors.from} ${activeDialogColors.to} ${activeDialogColors.border}`
    : 'bg-linear-to-br from-gray-900/95 to-gray-950/95 border-gray-500/10';

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      disableOpenAutoFocus
      overlayClassName={`animate-in fade-in ${surface.dialogBackdrop}`}
      contentClassName={`fixed top-1/2 left-1/2 z-50 h-auto max-h-[85vh] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200 ${gradientClassName}`}
    >
      <CustomScrollbar isOn={isOn}>
        <div className="p-6">
          <CardDialogHeader title={name} description={entityType} entityId={entityId} />

          <Tabs value={activeTab} defaultValue={activeTab} onValueChange={setActiveTab}>
            <CardDialogTabList>
              {hasControls ? (
                <CardDialogTabTrigger
                  active={activeTab === 'controls'}
                  icon={ToggleLeft}
                  onClick={() => setActiveTab('controls')}
                >
                  Controls
                </CardDialogTabTrigger>
              ) : null}
              {hasMetrics ? (
                <CardDialogTabTrigger
                  active={activeTab === 'metrics'}
                  icon={Sliders}
                  onClick={() => setActiveTab('metrics')}
                >
                  Metrics
                </CardDialogTabTrigger>
              ) : null}
              <CardDialogTabTrigger
                active={activeTab === 'card'}
                icon={Palette}
                onClick={() => setActiveTab('card')}
              >
                Customize
              </CardDialogTabTrigger>
            </CardDialogTabList>

            <TabPanel value="controls" className="mt-5 space-y-6">
              {hasControls ? (
                <DialogSectionRow
                  label={t('camera.settings.switches')}
                  labelClassName="mb-1 text-white"
                >
                  <div className="space-y-2">
                    {siblingEntities.map(({ id, entity }) => (
                      <SwitchControlRow
                        key={id}
                        entityId={id}
                        label={getSiblingDisplayName(id, entity)}
                        typeLabel={getEntityTypeLabel(id)}
                        isOn={entity.state === 'on'}
                      />
                    ))}
                  </div>
                </DialogSectionRow>
              ) : null}
            </TabPanel>

            <TabPanel value="metrics" className="mt-5 space-y-6">
              {hasMetrics ? (
                <DialogSectionRow
                  label={metricSectionTitle}
                  helperText={metricSectionDescription}
                  labelClassName="mb-1 text-white"
                  helperTextClassName="mb-3 text-white/78"
                >
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {availableMetrics.map((metric) => {
                      const isSelected = selectedMetricLabels.includes(metric.label);

                      return (
                        <button
                          type="button"
                          key={`dialog-${metric.label}`}
                          onClick={() => onMetricToggle(metric.label)}
                          aria-pressed={isSelected}
                          className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-left transition-colors ${
                            isSelected
                              ? 'border-white/25 bg-white/14'
                              : 'border-transparent bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <span
                              aria-hidden="true"
                              className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-lg border transition-colors ${
                                isSelected
                                  ? 'border-white/40 bg-white/18 text-white'
                                  : 'border-white/24 text-transparent'
                              }`}
                            >
                              <Check className="h-3 w-3" strokeWidth={3} />
                            </span>
                            <span className="min-w-0 text-left">
                              <span className="block text-xs leading-5 text-white/80">
                                {getMetricLabel(metric)}
                              </span>
                              <span className="block text-xs leading-5 font-medium text-white">
                                {formatMetricValue(metric) ?? '--'}
                              </span>
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </DialogSectionRow>
              ) : null}
            </TabPanel>

            <TabPanel value="card" className="mt-5 space-y-6">
              <CustomCardTintPicker value={tintColor} onChange={onTintColorChange} isOn={isOn} />
              <IconPicker
                selectedIcon={selectedIcon}
                onIconChange={onIconChange}
                isLightOn={isOn}
              />
            </TabPanel>
          </Tabs>

          <DialogDoneFooter label={t('common.done')} />
        </div>
      </CustomScrollbar>
    </DialogShell>
  );
});

function getSiblingDisplayName(entityId: string, entity: SwitchSiblingEntity['entity']): string {
  const friendly = entity.attributes?.friendly_name;
  if (typeof friendly === 'string' && friendly.trim().length > 0) {
    return friendly;
  }

  return entityId
    .replace(/^[^.]+\./, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (segment) => segment.toUpperCase());
}

function SwitchControlRow({
  entityId,
  label,
  typeLabel,
  isOn,
}: {
  entityId: string;
  label: string;
  typeLabel: string;
  isOn: boolean;
}) {
  const handleToggle = useCallback(async () => {
    await homeAssistantService.callService(
      'switch',
      isOn ? 'turn_off' : 'turn_on',
      {},
      { entity_id: entityId }
    );
  }, [entityId, isOn]);

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-transparent bg-white/5 px-4 py-3 text-left transition-colors hover:bg-white/10"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-white">{label}</span>
        <span className="block text-xs text-white/72">{typeLabel}</span>
      </span>
      <div
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          isOn ? 'bg-blue-500' : 'bg-white/20'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
            isOn ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </div>
    </button>
  );
}
